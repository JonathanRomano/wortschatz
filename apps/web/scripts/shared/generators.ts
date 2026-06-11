/**
 * The two ExerciseGenerator implementations runGeneration delegates to.
 *
 * - makeRemoteGenerator → POST /ai/generate-exercise on apps/api. The
 *   boundary-correct path (the heavy prompt-build + provider call +
 *   validation happen on Express). Used by the admin UI and a reachable CLI.
 * - makeDirectGenerator → builds the prompt and calls the in-process provider
 *   SDK directly, validating locally. The CLI's offline fallback when apps/api
 *   isn't running (Decision 3). Only ever reached from CLI scripts, never the
 *   Next.js runtime — so the SDK stays out of apps/web/src.
 *
 * Both return the same validated GeneratedExercisePayload. Errors are mapped
 * to the classes runGeneration's classifyError understands: the remote path
 * surfaces AiRateLimitedError (429) / GenerationValidationError (422); the
 * direct path throws GenerationError(parse_error | validation_error).
 */
import {
  applyPromptVoice,
  buildPrompt,
  extractJson,
  normalizeTags,
  normalizeTitle,
  validateExercise,
  type GenerationProvider,
  type PromptRegistry,
} from "@wortschatz/exercises";
import { getActiveBasePromptVoice } from "@wortschatz/database";

import { generateExerciseRemote } from "@/lib/api-client";

import {
  GenerationError,
  type ExerciseGenerator,
  type ProviderClient,
} from "./types";

/** Calls apps/api. `userId` (admin id) drives the per-user rate limit there. */
export function makeRemoteGenerator(
  provider: GenerationProvider,
  userId?: string,
): ExerciseGenerator {
  return async (input) => {
    const dto = await generateExerciseRemote(
      {
        type: input.type,
        level: input.level,
        topic: input.topic,
        recentExamples: input.recentExamples,
        customPrompt: input.customPrompt,
        provider,
        model: input.model,
      },
      userId,
    );
    return {
      title: dto.title,
      content: dto.content as Record<string, unknown>,
      solution: dto.solution as Record<string, unknown>,
      explanation: dto.explanation as Record<string, unknown>,
      tags: dto.tags,
      tip: dto.tip as Record<string, unknown> | undefined,
      modelUsed: dto.modelUsed,
      basePromptVersionId: dto.basePromptVersionId ?? null,
    };
  };
}

/**
 * In-process SDK generator. Builds the prompt with the shared builder, calls
 * the provided ProviderClient (callClaude / callGPT), then parses + validates
 * locally with the same shared helpers Express uses — so a CLI fallback run
 * produces byte-identical prompts and applies the identical validation gate.
 */
export function makeDirectGenerator(
  client: ProviderClient,
  prompts: PromptRegistry,
  provider: GenerationProvider = "claude",
): ExerciseGenerator {
  return async (input) => {
    const baseParts = prompts[input.type];
    // Honor DB-curated prompts even on the offline path (Decision 6): resolve
    // the ACTIVE version for (type, level) and override the editable voice,
    // exactly like apps/api does. Claude-only in v1; GPT uses its file.
    let parts = baseParts;
    let basePromptVersionId: string | null = null;
    if (provider === "claude") {
      const active = await getActiveBasePromptVoice(input.type, input.level);
      if (active) {
        parts = applyPromptVoice(baseParts, {
          systemPrompt: active.systemPrompt,
          userInstructions: active.userInstructions,
        });
        basePromptVersionId = active.versionId;
      }
    }
    const { system, user, maxTokens } = buildPrompt(
      parts,
      {
        level: input.level,
        topic: input.topic,
        recentExamples: input.recentExamples,
      },
      input.customPrompt,
    );
    const { text, modelUsed } = await client({
      system,
      user,
      maxTokens,
      model: input.model,
    });

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch (err) {
      throw new GenerationError(
        "parse_error",
        err instanceof Error ? err.message : String(err),
      );
    }

    const result = validateExercise(input.type, parsed);
    if (!result.ok) {
      throw new GenerationError("validation_error", result.errors.join("; "));
    }

    const obj = parsed as Record<string, unknown>;
    return {
      title: normalizeTitle(obj.title, input.type, input.topic),
      content: result.content,
      solution: result.solution,
      explanation: result.explanation,
      tags: normalizeTags(obj.tags, input.topic, input.level),
      tip: result.tip,
      modelUsed,
      basePromptVersionId,
    };
  };
}
