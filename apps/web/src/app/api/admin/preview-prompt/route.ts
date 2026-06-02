/**
 * POST /api/admin/preview-prompt — build and return the final system + user
 * prompts for one exercise WITHOUT calling the model, so an admin can verify
 * a custom prompt before spending tokens. Mirrors how the runner composes
 * the first item: topic falls back to the first canonical topic for the
 * level, and recent examples are injected exactly as generation would.
 */
import { prisma } from "@wortschatz/database";

import { claudePrompts } from "@scripts/claude/prompts";
import { buildPrompt, estimateTokens } from "@scripts/shared/prompt-builder";
import { fetchRecentExamples } from "@scripts/shared/recent-examples";
import { topicForIndex } from "@scripts/shared/topics";

import { mergeCustomPrompt } from "@/lib/admin/custom-prompt";
import { jsonError, jsonOk, requireAdmin } from "@/lib/admin/guard";
import { PreviewRequestSchema } from "@/lib/admin/schemas";

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

  const parsed = PreviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_error", 400, parsed.error.message);
  }
  const input = parsed.data;

  // Resolve a saved prompt (ownership + type) just like generation.
  let saved: { systemPrompt: string | null; userInstructions: string | null } | null = null;
  if (input.savedPromptId) {
    const row = await prisma.savedPrompt.findUnique({
      where: { id: input.savedPromptId },
    });
    if (!row || row.authorId !== userId) {
      return jsonError("saved_prompt_not_found", 404);
    }
    if (row.type !== input.type) {
      return jsonError("saved_prompt_type_mismatch", 400);
    }
    saved = { systemPrompt: row.systemPrompt, userInstructions: row.userInstructions };
  }

  const customPrompt = mergeCustomPrompt(input.customPrompt, saved);
  const topic = input.topic ?? topicForIndex(input.level, 0);
  const recentExamples = await fetchRecentExamples(input.type, input.level, 10);

  const { system, user } = buildPrompt(
    claudePrompts[input.type],
    { level: input.level, topic, recentExamples },
    customPrompt,
  );

  return jsonOk({
    system,
    user,
    estimatedTokens: estimateTokens(`${system}\n${user}`),
  });
}
