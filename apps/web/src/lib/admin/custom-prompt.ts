/**
 * Resolve the effective custom-prompt overrides for a generation/preview.
 *
 * Precedence: an explicit request override wins over the saved prompt's
 * value, which wins over the per-type default (represented by `undefined`,
 * which tells the builder to use the locked default). Whitespace-only and
 * null values are treated as "no override".
 */
import type { CustomPrompt } from "@scripts/shared/types";

export function mergeCustomPrompt(
  req: CustomPrompt | undefined,
  saved: { systemPrompt: string | null; userInstructions: string | null } | null,
): CustomPrompt | undefined {
  const system = req?.system ?? saved?.systemPrompt ?? undefined;
  const userInstructions =
    req?.userInstructions ?? saved?.userInstructions ?? undefined;
  if (!system && !userInstructions) return undefined;
  return {
    ...(system ? { system } : {}),
    ...(userInstructions ? { userInstructions } : {}),
  };
}
