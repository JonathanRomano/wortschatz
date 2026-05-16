"use server";

import type { CefrLevel, ExerciseType } from "@wortschatz/database";

import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";
import type { Locale } from "@/i18n/config";
import { pickLocalized } from "@wortschatz/config";
import { getRandomExerciseOfType } from "@/lib/exercises/actions";

export type NextExercisePayload = {
  id: string;
  type: ExerciseType;
  level: CefrLevel;
  title: string;
  instructions: string;
  explanation: string;
  content: Record<string, unknown>;
  alreadyEarned: boolean;
};

/**
 * Pick a random PUBLISHED exercise of the given type (excluding
 * `excludeId` when possible) and return it pre-localized for the
 * caller. Used by `/exercises/[type]` after each submission so the
 * "Next exercise" button can swap content without a full route change.
 *
 * `level` is honored as a hard filter: if the user picked A2 we never
 * return a B1 exercise, even if that means returning null and surfacing
 * the empty state.
 */
export async function fetchNextExerciseOfType(
  type: ExerciseType,
  locale: Locale,
  excludeId?: string,
  level?: CefrLevel,
): Promise<NextExercisePayload | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  const picked = await getRandomExerciseOfType(type, excludeId, level);
  if (!picked) return null;

  const [exercise, priorSuccess] = await Promise.all([
    prisma.exercise.findUniqueOrThrow({
      where: { id: picked.id },
      select: {
        id: true,
        title: true,
        instructions: true,
        explanation: true,
        type: true,
        level: true,
        content: true,
      },
    }),
    prisma.userExercise.findFirst({
      where: { userId, exerciseId: picked.id, score: { gte: 60 } },
      select: { id: true },
    }),
  ]);

  return {
    id: exercise.id,
    type: exercise.type,
    level: exercise.level,
    title: exercise.title,
    instructions: pickLocalized(exercise.instructions, locale),
    explanation: pickLocalized(exercise.explanation, locale),
    content: exercise.content as Record<string, unknown>,
    alreadyEarned: Boolean(priorSuccess),
  };
}
