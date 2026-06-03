/**
 * Provider-agnostic generation loop. Each caller hands us an
 * ExerciseGenerator (which builds + calls + validates one item) plus its
 * default model; the per-run flow (session open → topic rotation → recent
 * examples → generate → insert → session finalize) lives here so the CLI and
 * the admin UI can't drift on the orchestration.
 *
 * As of the API-boundary sprint the heavy work — prompt build + provider call
 * + validation — lives behind `config.generate`: the admin UI and a reachable
 * CLI use the remote generator (POST /ai/generate-exercise on apps/api); the
 * CLI's offline fallback uses the in-process SDK generator. Both return a
 * validated GeneratedExercisePayload, so this loop only orchestrates and
 * inserts and never imports a provider SDK. See ARCHITECTURE.md.
 *
 * The runner is session-aware (Decision 8): a supplied `context` (admin UI)
 * links exercises to a pre-created session and finalizes it; without it (CLI)
 * the runner opens its own `source: "CLI"` session authored by the seed
 * admin. A dry run creates no session and writes nothing.
 *
 * Failures never halt the run — a parse/validation/model error counts as
 * failed and the loop moves on — except a rate-limit error, which stops the
 * batch (every remaining item would fail the same way) after being recorded.
 */
import { fetchRecentExamples } from "./recent-examples";
import { insertExercise } from "./insert";
import {
  createGenerationSession,
  finalizeGenerationSession,
  seedAdminId,
} from "./session";
import { topicForIndex } from "./topics";
import type {
  ExerciseGenerator,
  GeneratedExerciseSummary,
  GenerationContext,
  GenerationFailure,
  GenerationFailureCode,
  GenerationRequest,
  GenerationResult,
} from "./types";

export interface RunConfig {
  /** "claude" | "gpt" — used for logging and as GenerationSession.provider. */
  providerLabel: string;
  /** Produces one validated exercise per call (remote endpoint or direct SDK). */
  generate: ExerciseGenerator;
  /**
   * Model recorded on the session header. The per-item model that actually
   * produced each exercise comes back from `generate()` and is what gets
   * persisted to Exercise.model.
   */
  defaultModel: string;
  request: GenerationRequest;
  /**
   * UI calls pass a pre-created session + author + source. Omitted by the
   * CLI, in which case the runner opens its own session (source "CLI",
   * seed admin).
   */
  context?: GenerationContext;
  /** Provider model override (CLI --model), forwarded to the generator. */
  model?: string;
  /** Delay between generate() calls to dodge rate limits (CLI --delay-ms). */
  delayMs?: number;
  /** Print the recent-examples block that was sent (CLI --verbose). */
  verbose?: boolean;
  /** Progress sink. CLI passes a console logger; the API leaves it unset. */
  onProgress?: (line: string) => void;
  /**
   * Called once before each generate() call. The per-user generation rate
   * limit now lives on apps/api, so the admin UI path leaves this unset;
   * retained for the CLI / future use. Throwing an AiRateLimitedError stops
   * the batch.
   */
  beforeEach?: () => Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function override(s: string | undefined): boolean {
  return !!(s && s.trim().length > 0);
}

/**
 * Map a thrown generator error onto a failure code. Both generators signal
 * the same way: AiRateLimitedError (stops the batch),
 * GenerationValidationError (the remote 422) and GenerationError (the direct
 * parse/validation miss) carry the specific code; anything else is a model
 * error.
 */
function classifyError(err: unknown): GenerationFailureCode {
  if (err instanceof Error) {
    if (err.name === "AiRateLimitedError") return "rate_limited";
    if (err.name === "GenerationValidationError") return "validation_error";
    const code = (err as { code?: unknown }).code;
    if (
      code === "validation_error" ||
      code === "parse_error" ||
      code === "model_error" ||
      code === "rate_limited"
    ) {
      return code;
    }
  }
  return "model_error";
}

export async function runGeneration(config: RunConfig): Promise<GenerationResult> {
  const { providerLabel, generate, defaultModel, request, context } = config;
  const { type, level, count } = request;
  const log = config.onProgress ?? (() => {});
  const dryRun = request.dryRun ?? false;
  const noRecent = request.noRecent ?? false;
  const modelUsed = config.model ?? defaultModel;

  const startedAt = Date.now();

  // Open a session unless this is a dry run. Reuse the caller's when given.
  let sessionId = context?.sessionId ?? "";
  if (!dryRun && !sessionId) {
    const authorId = context?.authorId ?? (await seedAdminId());
    sessionId = await createGenerationSession({
      authorId,
      source: context?.source ?? "CLI",
      provider: providerLabel,
      modelUsed,
      type,
      level,
      topic: request.topic,
      requestedCount: count,
      savedPromptId: request.savedPromptId,
      customSystem: override(request.customPrompt?.system),
      customInstructions: override(request.customPrompt?.userInstructions),
    });
  }

  log(
    `[${providerLabel}] ${type} · ${level} · count=${count}` +
      `${request.topic ? ` · topic=${request.topic}` : " · topics=auto"}` +
      `${dryRun ? " · DRY RUN" : ""}` +
      ` · model=${modelUsed}`,
  );

  const generated: GeneratedExerciseSummary[] = [];
  const failed: GenerationFailure[] = [];

  for (let i = 0; i < count; i++) {
    const topic = request.topic ?? topicForIndex(level, i);
    const label = `[${i + 1}/${count}] ${type} ${level} ${topic}`;

    try {
      if (config.beforeEach) await config.beforeEach();

      const recentExamples = noRecent
        ? []
        : await fetchRecentExamples(type, level, 10);

      if (config.verbose && recentExamples.length > 0) {
        log(`  ${label} — recent examples sent:`);
        for (const ex of recentExamples) log(`    · ${ex.excerpt}`);
      }

      const ex = await generate({
        type,
        level,
        topic,
        recentExamples,
        customPrompt: request.customPrompt,
        model: config.model,
      });

      const summary: GeneratedExerciseSummary = {
        id: null,
        type,
        level,
        title: ex.title,
        topic,
        modelUsed: ex.modelUsed,
        content: ex.content,
        solution: ex.solution,
        explanation: ex.explanation,
        tags: ex.tags,
        tip: ex.tip,
      };

      if (dryRun) {
        generated.push(summary);
        log(`  [DRY] ${label} — "${ex.title}"`);
        log(
          JSON.stringify(
            { title: ex.title, content: ex.content, solution: ex.solution, tags: ex.tags, tip: ex.tip },
            null,
            2,
          ),
        );
      } else {
        const id = await insertExercise({
          type,
          level,
          title: ex.title,
          content: ex.content,
          solution: ex.solution,
          explanation: ex.explanation,
          tip: ex.tip,
          tags: ex.tags,
          modelUsed: ex.modelUsed,
          generationSessionId: sessionId || undefined,
        });
        summary.id = id;
        generated.push(summary);
        log(`  [OK] ${label} — "${ex.title}" (${id})`);
      }
    } catch (err) {
      const code = classifyError(err);
      const reason = err instanceof Error ? err.message : String(err);
      failed.push({ index: i, topic, reason, code });
      log(`  [${code === "rate_limited" ? "STOP" : "SKIP"}] ${label} — ${reason}`);
      // A rate-limit error would recur for every remaining item; stop here.
      if (code === "rate_limited") break;
    }

    if ((config.delayMs ?? 0) > 0 && i < count - 1) await sleep(config.delayMs!);
  }

  const totalDurationMs = Date.now() - startedAt;

  if (sessionId) {
    await finalizeGenerationSession(sessionId, {
      successCount: generated.length,
      failureCount: failed.length,
      failures: failed,
      durationMs: totalDurationMs,
    });
  }

  log(
    `Done: ${generated.length}/${count} generated successfully` +
      `${failed.length > 0 ? ` (${failed.length} failed)` : ""}.`,
  );

  return { sessionId, generated, failed, totalDurationMs, cacheHits: 0 };
}
