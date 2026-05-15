import type { MuenzenReason, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const MUENZEN_RULES = {
  exerciseComplete: 10, // score >= 60
  perfectBonus: 5, // score === 100, additional
  dailyStreak: 20, // first exercise of a calendar day
  aiReviewCost: 30,
} as const;

export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient Münzen.");
    this.name = "InsufficientFundsError";
  }
}

/**
 * Credit Münzen and write the matching transaction. Wrap callers in
 * `prisma.$transaction([...])` if more than one mutation needs to be
 * atomic with the credit.
 */
export async function credit(
  userId: string,
  amount: number,
  reason: MuenzenReason,
  refId?: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  if (amount <= 0) throw new Error("credit() expects a positive amount");
  await tx.user.update({
    where: { id: userId },
    data: { muenzen: { increment: amount } },
  });
  await tx.muenzenTransaction.create({
    data: { userId, amount, reason, refId: refId ?? null },
  });
}

/**
 * Debit Münzen, refusing if the user can't cover the cost. Always runs
 * inside a transaction so the balance check and the update are atomic.
 */
export async function debit(
  userId: string,
  amount: number,
  reason: MuenzenReason,
  refId?: string,
): Promise<void> {
  if (amount <= 0) throw new Error("debit() expects a positive amount");
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { muenzen: true },
    });
    if (!user) throw new Error("User not found");
    if (user.muenzen < amount) throw new InsufficientFundsError();
    await tx.user.update({
      where: { id: userId },
      data: { muenzen: { decrement: amount } },
    });
    await tx.muenzenTransaction.create({
      data: { userId, amount: -amount, reason, refId: refId ?? null },
    });
  });
}

/**
 * Compute the reward for a completed exercise. Returns the three reward
 * components separately so each can be written as its own
 * `MuenzenTransaction` (`EXERCISE_COMPLETE`, `PERFECT_SCORE_BONUS`,
 * `DAILY_STREAK`). Doesn't mutate anything — the caller decides whether
 * to credit each non-zero component.
 */
export function computeReward(
  score: number,
  isFirstOfDay: boolean,
): { base: number; perfect: number; streakBonus: number } {
  const passed = score >= 60;
  const base = passed ? MUENZEN_RULES.exerciseComplete : 0;
  const perfect = score === 100 ? MUENZEN_RULES.perfectBonus : 0;
  const streakBonus = isFirstOfDay && passed ? MUENZEN_RULES.dailyStreak : 0;
  return { base, perfect, streakBonus };
}

/**
 * Admin tool. Apply an adjustment (positive or negative) to a user's
 * balance, recording an `ADMIN_ADJUSTMENT` transaction. Idempotent only
 * within the caller's session — callers are responsible for not
 * double-applying. Throws `InsufficientFundsError` if a negative
 * adjustment would drive the balance below zero.
 *
 * The optional `note` is stored in the existing `refId` column. This
 * overloads `refId`'s usual purpose (foreign-key-ish exerciseId /
 * aiReviewRequestId) but avoids a schema migration — fine for now, and
 * the history page distinguishes by `reason`.
 */
export async function adminAdjust(
  userId: string,
  delta: number,
  note?: string,
): Promise<void> {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error("adminAdjust() expects a non-zero integer delta");
  }
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { muenzen: true },
    });
    if (!user) throw new Error("User not found");
    if (delta < 0 && user.muenzen + delta < 0) {
      throw new InsufficientFundsError();
    }
    await tx.user.update({
      where: { id: userId },
      data: { muenzen: { increment: delta } },
    });
    await tx.muenzenTransaction.create({
      data: {
        userId,
        amount: delta,
        reason: "ADMIN_ADJUSTMENT",
        refId: note?.trim() ? note.trim() : null,
      },
    });
  });
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
