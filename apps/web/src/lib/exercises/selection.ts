import type { CefrLevel, ExerciseType, Prisma } from "@wortschatz/database";

/**
 * Feature flag — Overnight loop iter 3. Prefer exercises the learner hasn't
 * already passed when drawing the next random exercise, so the "Next" stream
 * surfaces fresh material instead of re-serving mastered prompts (Anki/Duolingo:
 * mastered items leave the active queue). Flip to `false` to restore the pure
 * uniform-random draw over the whole published pool (pre-iter-3 behavior).
 */
export const PREFER_UNSEEN_EXERCISES: boolean = true;

/**
 * Feature flag — Overnight loop iter 13. Bias the random draw toward "weak"
 * items — exercises the learner has attempted but never passed (best score
 * < 60) — so mistakes resurface automatically during normal practice instead
 * of only via the mistakes page (Anki/Memrise "difficult words"). Falls back to
 * the unseen/full tiers once there are none. Flip to `false` to disable.
 */
export const PREFER_WEAK_EXERCISES: boolean = true;

/**
 * Build the ordered list of `where` clauses to try when picking a random
 * exercise of a type. The caller attempts each in order and takes the first
 * tier that yields a row:
 *
 *   Tier 1 (only when {@link PREFER_WEAK_EXERCISES} and the learner has ≥1
 *           weak item of this type/level): exercises attempted but never passed
 *           (`id IN weakIds`) — resurface mistakes first.
 *   Tier 2 (only when {@link PREFER_UNSEEN_EXERCISES} and the learner has
 *           already passed ≥1 exercise of this type/level): the full filter
 *           MINUS every already-passed exercise id — i.e. "unseen/unmastered".
 *   Tier 3: the full published pool (the original uniform-random behavior),
 *           so the stream never dead-ends once everything has been passed.
 *
 * Pure and DB-free so the tiering is unit-testable in isolation. The random
 * skip/take and the cross-level fallback stay in the server action.
 */
export function buildSelectionWheres(
  type: ExerciseType,
  excludeId: string | undefined,
  level: CefrLevel | undefined,
  passedIds: string[],
  preferUnseen: boolean = PREFER_UNSEEN_EXERCISES,
  weakIds: string[] = [],
  preferWeak: boolean = PREFER_WEAK_EXERCISES,
): Prisma.ExerciseWhereInput[] {
  const full: Prisma.ExerciseWhereInput = {
    type,
    status: "PUBLISHED",
    ...(excludeId ? { id: { not: excludeId } } : {}),
    ...(level ? { level } : {}),
  };

  const tiers: Prisma.ExerciseWhereInput[] = [];

  // Tier 1 — weak items (attempted, never passed): resurface mistakes first.
  if (preferWeak && weakIds.length > 0) {
    tiers.push({
      type,
      status: "PUBLISHED",
      ...(level ? { level } : {}),
      id: excludeId ? { not: excludeId, in: weakIds } : { in: weakIds },
    });
  }

  // Tier 2 — unseen (exclude already-passed).
  if (preferUnseen && passedIds.length > 0) {
    tiers.push({
      type,
      status: "PUBLISHED",
      ...(level ? { level } : {}),
      id: excludeId
        ? { not: excludeId, notIn: passedIds }
        : { notIn: passedIds },
    });
  }

  // Tier 3 — the full pool, so the stream never dead-ends.
  tiers.push(full);
  return tiers;
}
