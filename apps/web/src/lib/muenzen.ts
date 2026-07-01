import type { MuenzenReason, Prisma } from "@wortschatz/database";
import { prisma } from "@wortschatz/database";

export const MUENZEN_RULES = {
  exerciseComplete: 10, // score >= 60
  exerciseCompleteWithTip: 3, // score >= 60 AND tip was revealed
  perfectBonus: 5, // score === 100, additional
  dailyStreak: 20, // first exercise of a calendar day
  aiReviewCost: 30,
} as const;

/**
 * Feature flag — Overnight loop iter 5. On top of the flat daily-streak bonus,
 * award a one-time escalating bonus the day a streak first reaches a milestone
 * length. Reuses the DAILY_STREAK transaction reason (no new enum → no
 * migration). Flip to `false` to restore the flat-bonus-only behavior.
 */
export const STREAK_MILESTONE_REWARDS: boolean = true;

/**
 * Extra Münzen granted the day a streak first reaches each milestone length,
 * keyed by exact streak length. Looked up by exact match, so each fires once
 * as the streak climbs; a broken-then-rebuilt streak can re-earn them.
 */
export const STREAK_MILESTONES: Readonly<Record<number, number>> = {
  7: 30,
  14: 50,
  30: 100,
  50: 150,
  100: 300,
  200: 600,
  365: 1000,
};

/** Milestone bonus for reaching exactly `streakLength` days (0 if none / off). */
export function streakMilestoneBonus(streakLength: number): number {
  if (!STREAK_MILESTONE_REWARDS) return 0;
  return STREAK_MILESTONES[streakLength] ?? 0;
}

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
  tipUsed: boolean = false,
  streakLength: number = 0,
): {
  base: number;
  perfect: number;
  streakBonus: number;
  milestoneBonus: number;
} {
  const passed = score >= 60;
  const baseAmount = tipUsed
    ? MUENZEN_RULES.exerciseCompleteWithTip
    : MUENZEN_RULES.exerciseComplete;
  const base = passed ? baseAmount : 0;
  // Perfect bonus and daily streak are independent of the tip — the tip
  // reduces only the base completion credit.
  const perfect = score === 100 ? MUENZEN_RULES.perfectBonus : 0;
  const earnsStreak = isFirstOfDay && passed;
  const streakBonus = earnsStreak ? MUENZEN_RULES.dailyStreak : 0;
  // Milestone bonus is gated on the same first-of-day pass so it can only
  // fire on the day the streak actually advances to the milestone length.
  const milestoneBonus = earnsStreak ? streakMilestoneBonus(streakLength) : 0;
  return { base, perfect, streakBonus, milestoneBonus };
}

export type RewardBreakdown = {
  base: number;
  perfect: number;
  streakBonus: number;
  milestoneBonus: number;
};

/**
 * Apply the "already earned" guard. The per-EXERCISE rewards (base completion
 * credit + perfect bonus) are paid only the first time a user passes a given
 * exercise, so they're zeroed on a repeat pass. The per-DAY streak rewards
 * (flat daily bonus + milestone bonus) are NOT zeroed — they ride on the first
 * passing attempt of the calendar day, which is exactly when the streak
 * counter advances, even if that attempt is a previously-passed exercise.
 *
 * Without this split, a repeat exercise as the day's first pass would silently
 * drop the streak/milestone bonus while the streak counter still advanced —
 * and a milestone missed this way is permanently lost (the next day's streak
 * length is no longer a milestone).
 */
export function applyEarnedGuard(
  rewards: RewardBreakdown,
  alreadyEarned: boolean,
): RewardBreakdown {
  if (!alreadyEarned) return rewards;
  return {
    base: 0,
    perfect: 0,
    streakBonus: rewards.streakBonus,
    milestoneBonus: rewards.milestoneBonus,
  };
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
