/**
 * Provider-agnostic generation loop. Each provider's generate.ts parses
 * args and hands us its client + prompt registry + default model; the
 * per-run flow (session open → topic rotation → recent examples → build
 * prompt → call → extract → validate → insert → session finalize) lives
 * here so the two providers can't drift on the orchestration. Prompt
 * content and the SDK clients stay fully independent per provider.
 *
 * The runner is session-aware (Decision 8). When the caller supplies a
 * `context` (the admin API pre-creates a session to record UI metadata and
 * obtain its id), the runner links exercises to it and finalizes it. When
 * `context` is omitted (the CLI), the runner opens its own session marked
 * `source: "CLI"` authored by the seed admin. A dry run creates no session
 * and writes nothing.
 *
 * The runner is silent by default and returns a structured GenerationResult;
 * the CLI consumers pass an `onProgress` sink to render the human log they
 * used to print inline. Failures never halt the run — a parse/validation/
 * model error counts as failed and the loop moves on — except a rate-limit
 * error, which stops the batch (every remaining item would fail the same
 * way) after being recorded.
 */
import { extractJson } from "./json";
import { buildPrompt } from "./prompt-builder";
import { fetchRecentExamples } from "./recent-examples";
import { insertExercise } from "./insert";
import {
  createGenerationSession,
  finalizeGenerationSession,
  seedAdminId,
} from "./session";
import { topicForIndex } from "./topics";
import { normalizeTags, normalizeTitle, validateExercise } from "./validate";
import type {
  GeneratedExerciseSummary,
  GenerationContext,
  GenerationFailure,
  GenerationFailureCode,
  GenerationRequest,
  GenerationResult,
  ProviderClient,
  PromptRegistry,
} from "./types";

export interface RunConfig {
  /** "claude" | "gpt" — used for logging and as GenerationSession.provider. */
  providerLabel: string;
  client: ProviderClient;
  prompts: PromptRegistry;
  defaultModel: string;
  request: GenerationRequest;
  /**
   * UI calls pass a pre-created session + author + source. Omitted by the
   * CLI, in which case the runner opens its own session (source "CLI",
   * seed admin).
   */
  context?: GenerationContext;
  /** Provider model override (CLI --model). */
  model?: string;
  /** Delay between provider calls to dodge rate limits (CLI --delay-ms). */
  delayMs?: number;
  /** Print the recent-examples block that was sent (CLI --verbose). */
  verbose?: boolean;
  /** Progress sink. CLI passes a console logger; the API leaves it unset. */
  onProgress?: (line: string) => void;
  /**
   * Called once before each provider call. The admin API injects the
   * per-user rate-limit check here; the CLI leaves it unset. Throwing an
   * AiRateLimitedError stops the batch.
   */
  beforeEach?: () => Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function override(s: string | undefined): boolean {
  return !!(s && s.trim().length > 0);
}

function classifyError(err: unknown): GenerationFailureCode {
  if (err instanceof Error && err.name === "AiRateLimitedError") {
    return "rate_limited";
  }
  return "model_error";
}

export async function runGeneration(config: RunConfig): Promise<GenerationResult> {
  const { providerLabel, client, prompts, defaultModel, request, context } = config;
  const { type, level, count } = request;
  const log = config.onProgress ?? (() => {});
  const dryRun = request.dryRun ?? false;
  const noRecent = request.noRecent ?? false;
  const modelUsed = config.model ?? defaultModel;
  const parts = prompts[type];

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

      const { system, user, maxTokens } = buildPrompt(
        parts,
        { level, topic, recentExamples },
        request.customPrompt,
      );
      const { text, modelUsed: usedModel } = await client({
        system,
        user,
        maxTokens,
        model: config.model,
      });

      let parsed: unknown;
      try {
        parsed = extractJson(text);
      } catch (err) {
        failed.push({
          index: i,
          topic,
          reason: err instanceof Error ? err.message : String(err),
          code: "parse_error",
        });
        log(`  [SKIP] ${label} — could not parse JSON from the response.`);
        continue;
      }

      const result = validateExercise(type, parsed);
      if (!result.ok) {
        failed.push({
          index: i,
          topic,
          reason: result.errors.join("; "),
          code: "validation_error",
        });
        log(`  [SKIP] ${label} — validation failed:`);
        for (const err of result.errors) log(`         · ${err}`);
        continue;
      }

      const raw = parsed as Record<string, unknown>;
      const title = normalizeTitle(raw.title, type, topic);
      const tags = normalizeTags(raw.tags, topic, level);

      const summary: GeneratedExerciseSummary = {
        id: null,
        type,
        level,
        title,
        topic,
        modelUsed: usedModel,
        content: result.content,
        solution: result.solution,
        explanation: result.explanation,
        tags,
        tip: result.tip,
      };

      if (dryRun) {
        generated.push(summary);
        log(`  [DRY] ${label} — "${title}"`);
        log(
          JSON.stringify(
            { title, content: result.content, solution: result.solution, tags, tip: result.tip },
            null,
            2,
          ),
        );
      } else {
        const id = await insertExercise({
          type,
          level,
          title,
          content: result.content,
          solution: result.solution,
          explanation: result.explanation,
          tip: result.tip,
          tags,
          modelUsed: usedModel,
          generationSessionId: sessionId || undefined,
        });
        summary.id = id;
        generated.push(summary);
        log(`  [OK] ${label} — "${title}" (${id})`);
      }
    } catch (err) {
      const code = classifyError(err);
      const reason = err instanceof Error ? err.message : String(err);
      failed.push({ index: i, topic, reason, code });
      log(`  [FAIL] ${label} — ${reason}`);
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
