/**
 * POST /api/admin/generate-exercises — admin exercise generation.
 *
 * This route is a thin orchestrator (API-boundary sprint): the heavy LLM work
 * — prompt build + provider call + validation — runs on apps/api via
 * `makeRemoteGenerator` (POST /ai/generate-exercise), NOT in this Next.js
 * serverless function. See ARCHITECTURE.md.
 *
 * Flow: ADMIN auth → validate body → resolve saved prompt (ownership + type)
 * → create the GenerationSession (UI source) → runGeneration (which calls
 * apps/api per item, links the exercises, and finalizes the session) → bump
 * SavedPrompt.useCount → shape the response. The per-user GENERATE_EXERCISE
 * rate limit now fires on apps/api (it receives X-User-Id); a batch that's
 * fully rate-limited before producing anything still returns 429 here. A dry
 * run creates no session and writes nothing.
 */
import { prisma } from "@wortschatz/database";

import { runGeneration } from "@scripts/shared/run";
import { createGenerationSession } from "@scripts/shared/session";
import { makeRemoteGenerator } from "@scripts/shared/generators";
import type { GenerationRequest } from "@scripts/shared/types";

import { CLAUDE_DEFAULT_MODEL, claudeModelLabel } from "@/lib/admin/claude-client";
import { mergeCustomPrompt } from "@/lib/admin/custom-prompt";
import { jsonError, jsonOk, requireAdmin } from "@/lib/admin/guard";
import { GenerateRequestSchema } from "@/lib/admin/schemas";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.res;
  const userId = guard.userId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_json", 400, "Request body must be valid JSON.");
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_error", 400, parsed.error.message);
  }
  const input = parsed.data;

  try {
    // Resolve a saved prompt: it must belong to this admin and match the type.
    let saved: { systemPrompt: string | null; userInstructions: string | null } | null = null;
    if (input.savedPromptId) {
      const row = await prisma.savedPrompt.findUnique({
        where: { id: input.savedPromptId },
      });
      if (!row || row.authorId !== userId) {
        return jsonError("saved_prompt_not_found", 404);
      }
      if (row.type !== input.type) {
        return jsonError(
          "saved_prompt_type_mismatch",
          400,
          "The saved prompt is for a different exercise type.",
        );
      }
      saved = { systemPrompt: row.systemPrompt, userInstructions: row.userInstructions };
    }

    const customPrompt = mergeCustomPrompt(input.customPrompt, saved);
    const dryRun = input.dryRun ?? false;

    const genRequest: GenerationRequest = {
      type: input.type,
      level: input.level,
      topic: input.topic,
      count: input.count,
      dryRun,
      noRecent: input.noRecent,
      customPrompt,
      savedPromptId: input.savedPromptId,
    };

    // Pre-create the session so it carries the UI metadata; the runner links
    // the exercises and finalizes it. Dry runs create nothing.
    let sessionId = "";
    if (!dryRun) {
      sessionId = await createGenerationSession({
        authorId: userId,
        source: "UI",
        provider: "claude",
        modelUsed: claudeModelLabel(),
        type: input.type,
        level: input.level,
        topic: input.topic,
        requestedCount: input.count,
        savedPromptId: input.savedPromptId,
        customSystem: !!customPrompt?.system,
        customInstructions: !!customPrompt?.userInstructions,
      });
    }

    const result = await runGeneration({
      providerLabel: "claude",
      generate: makeRemoteGenerator("claude", userId),
      defaultModel: CLAUDE_DEFAULT_MODEL,
      request: genRequest,
      context: dryRun ? undefined : { sessionId, authorId: userId, source: "UI" },
    });

    if (!dryRun && input.savedPromptId) {
      await prisma.savedPrompt.update({
        where: { id: input.savedPromptId },
        data: { useCount: { increment: 1 } },
      });
    }

    // Fully rate-limited before producing anything → surface a clean 429.
    if (
      result.generated.length === 0 &&
      result.failed.length > 0 &&
      result.failed.every((f) => f.code === "rate_limited")
    ) {
      return jsonError("rate_limited", 429);
    }

    return jsonOk({ result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError("unknown", 500, msg);
  }
}
