"use server";

import { revalidatePath } from "next/cache";
import type { ExerciseStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { adminAdjust, InsufficientFundsError } from "@/lib/muenzen";

export async function setExerciseStatus(id: string, status: ExerciseStatus) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
    throw new Error("Forbidden");
  }
  await prisma.exercise.update({ where: { id }, data: { status } });
  revalidatePath("/admin");
  revalidatePath("/exercises");
}

export type AdminAdjustResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "forbidden"
        | "invalid_amount"
        | "invalid_note"
        | "insufficient_funds";
    };

// Bounds for a single admin adjustment. Keeps a typo'd extra zero from
// silently torching (or inflating) a balance.
const MAX_DELTA = 100_000;
const MAX_NOTE_LEN = 280;

/**
 * ADMIN-only: credit or debit a user's Münzen balance and record an
 * `ADMIN_ADJUSTMENT` transaction. The optional note is stored in the
 * transaction's `refId` (free-form context column) — see `adminAdjust`.
 */
export async function adminAdjustUser(
  userId: string,
  delta: number,
  note?: string,
): Promise<AdminAdjustResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "forbidden" };
  }
  if (
    !Number.isFinite(delta) ||
    !Number.isInteger(delta) ||
    delta === 0 ||
    Math.abs(delta) > MAX_DELTA
  ) {
    return { ok: false, error: "invalid_amount" };
  }
  if (note !== undefined && note.length > MAX_NOTE_LEN) {
    return { ok: false, error: "invalid_note" };
  }
  try {
    await adminAdjust(userId, delta, note);
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return { ok: false, error: "insufficient_funds" };
    }
    throw err;
  }
  revalidatePath("/admin");
  return { ok: true };
}
