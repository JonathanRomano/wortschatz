"use server";

import type { ExerciseType } from "@wortschatz/database";

import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";

/**
 * Toggle the "skip the intro" preference for a given exercise type.
 *
 * The row's existence alone is the signal. `skipIntro` is stored as
 * `true` on every row for now — passing `skip: false` deletes the row.
 * Returns `{ ok: false }` for anonymous callers (no error throw so the
 * UI can fire-and-forget without blocking navigation).
 */
export async function setSkipIntro(
  type: ExerciseType,
  skip: boolean,
): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  const userId = session.user.id;

  if (skip) {
    await prisma.userPreference.upsert({
      where: { userId_key: { userId, key: type } },
      create: { userId, key: type, skipIntro: true },
      update: { skipIntro: true },
    });
  } else {
    await prisma.userPreference.deleteMany({
      where: { userId, key: type },
    });
  }
  return { ok: true };
}

/**
 * Server helper: true iff a `UserPreference` row exists for this
 * (user, type). Callers should only invoke this when `userId` is
 * already a known authenticated id.
 */
export async function getSkipIntro(
  userId: string,
  type: ExerciseType,
): Promise<boolean> {
  const row = await prisma.userPreference.findUnique({
    where: { userId_key: { userId, key: type } },
    select: { id: true },
  });
  return Boolean(row);
}
