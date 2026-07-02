"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@wortschatz/database";
import { auth } from "@/auth";
import { gradeLocally } from "@/lib/exercises/grade";
import {
  buildSelectionWheres,
  PREFER_UNSEEN_EXERCISES,
  PREFER_WEAK_EXERCISES,
} from "@/lib/exercises/selection";
import {
  evaluateAnswer,
  AI_CONFIGURED,
  AiRateLimitedError,
} from "@/lib/ai";
import {
  applyEarnedGuard,
  computeReward,
  credit,
  isSameCalendarDay,
  startOfUtcDay,
} from "@/lib/muenzen";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";

export type SubmitResult =
  | {
      ok: true;
      score: number;
      feedback: string;
      reward: number;
      streakBonus: number;
      newStreak: number;
      // True when the user had already earned Münzen for this exercise
      // on a prior successful attempt, so this submission is a retry
      // and no Münzen were awarded.
      alreadyEarned: boolean;
      // Correct-answer summary for a closed-form exercise the learner didn't
      // ace (see gradeLocally / REVEAL_CORRECT_ANSWER); undefined otherwise.
      correctAnswer?: string;
      // Per-blank mismatches for FILL_IN_THE_BLANK (learner input vs correct).
      mismatches?: { got: string; expected: string }[];
      // The streak length reached when this attempt crossed a streak milestone
      // (7/14/30/…) and its bonus was awarded; undefined otherwise. Lets the UI
      // show a distinct "milestone!" celebration vs a normal streak tick.
      streakMilestone?: number;
    }
  | { ok: false; error: string };

export async function submitExerciseAttempt(
  exerciseId: string,
  rawAnswer: Record<string, unknown>,
  tipUsed: boolean = false,
): Promise<SubmitResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated." };
  const userId = session.user.id;

  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return { ok: false, error: "Exercise not found." };
  if (exercise.status !== "PUBLISHED") {
    return { ok: false, error: "Exercise not available." };
  }

  // Local grading first.
  const local = gradeLocally(
    {
      type: exercise.type,
      content: exercise.content as object,
      solution: exercise.solution as object,
    },
    rawAnswer,
  );

  let score = local.score;
  let feedback = local.feedback;

  // Fall back to AI when local grading isn't deterministic and AI is on.
  // Swallow rate-limit errors here — the local grade is still recorded,
  // so the user just doesn't get the richer AI feedback this attempt.
  if (!local.deterministic && AI_CONFIGURED) {
    try {
      const ai = await evaluateAnswer(exercise, rawAnswer, userId);
      score = ai.score;
      feedback = ai.feedback;
    } catch (err) {
      if (!(err instanceof AiRateLimitedError)) throw err;
      // Keep the local placeholder feedback; surface a soft note so the
      // UI can show that AI grading wasn't applied this time.
      feedback =
        feedback +
        " (AI evaluation skipped: daily limit reached. Try again tomorrow.)";
    }
  }

  // Streak handling: bump if last activity was yesterday, reset if older.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { lastActiveAt: true, streak: true },
  });
  const now = new Date();
  const isFirstOfDay =
    !user.lastActiveAt || !isSameCalendarDay(user.lastActiveAt, now);
  let newStreak = user.streak;
  if (isFirstOfDay && score >= 60) {
    if (user.lastActiveAt) {
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      newStreak = isSameCalendarDay(user.lastActiveAt, yesterday)
        ? user.streak + 1
        : 1;
    } else {
      newStreak = 1;
    }
  }

  // Münzen are awarded only on the FIRST successful attempt for this
  // exercise. Subsequent passes still record the attempt and return
  // feedback, but skip the reward silently.
  const priorSuccess = await prisma.userExercise.findFirst({
    where: { userId, exerciseId, score: { gte: 60 } },
    select: { id: true },
  });
  const alreadyEarned = Boolean(priorSuccess);

  // The client tells us whether the tip was revealed; we trust it
  // (anti-cheat isn't meaningful — the same client could simply omit the
  // flag). If the exercise has no tip column at all, treat the flag as
  // false so a malformed payload can't dock the reward.
  const exerciseHasTip = exercise.tip !== null && exercise.tip !== undefined;
  const effectiveTipUsed = tipUsed && exerciseHasTip;

  // base/perfect are per-exercise (dropped on a repeat pass); streak + milestone
  // are per-day and ride the first-of-day pass even when the exercise is a
  // repeat — see applyEarnedGuard.
  const { base, perfect, streakBonus, milestoneBonus } = applyEarnedGuard(
    computeReward(score, isFirstOfDay, effectiveTipUsed, newStreak),
    alreadyEarned,
  );
  // The legacy `reward` surface in the SubmitResult bundles the
  // exercise-completion credit + perfect-score bonus into one figure for
  // the UI banner. We still write them as two separate transactions in
  // the DB so the history page can show them as distinct rows.
  const reward = base + perfect;

  // How much streak reward was actually granted (0 unless this submission wins
  // the day). Set inside the transaction; surfaced in the result below.
  let streakAwarded = 0;

  await prisma.$transaction(async (tx) => {
    await tx.userExercise.create({
      data: {
        userId,
        exerciseId,
        answer: rawAnswer as object,
        score,
        feedback,
        tipUsed: effectiveTipUsed,
      },
    });

    // Per-exercise credits (already suppressed on a repeat pass via
    // applyEarnedGuard above).
    if (base > 0) await credit(userId, base, "EXERCISE_COMPLETE", exerciseId, tx);
    if (perfect > 0) await credit(userId, perfect, "PERFECT_SCORE_BONUS", exerciseId, tx);

    if (isFirstOfDay && score >= 60) {
      // Atomically claim the first pass of this UTC day. Under concurrent
      // same-day submissions, only the first writer matches (lastActiveAt is
      // still before today's UTC midnight), so the streak advances and its
      // bonuses are paid exactly once — closing the read-then-write race that
      // could otherwise double-award the flat + milestone streak bonus.
      const claim = await tx.user.updateMany({
        where: {
          id: userId,
          OR: [
            { lastActiveAt: null },
            { lastActiveAt: { lt: startOfUtcDay(now) } },
          ],
        },
        data: { lastActiveAt: now, streak: newStreak },
      });
      if (claim.count === 1) {
        streakAwarded = streakBonus + milestoneBonus;
        if (streakBonus > 0) {
          await credit(userId, streakBonus, "DAILY_STREAK", exerciseId, tx);
        }
        // Escalating streak-milestone bonus (iter 5). Same DAILY_STREAK reason,
        // a distinct refId so the history page can tell it from the flat bonus.
        if (milestoneBonus > 0) {
          await credit(userId, milestoneBonus, "DAILY_STREAK", `streak-milestone:${newStreak}`, tx);
        }
      }
    } else {
      // Not a first-of-day pass: just record the activity timestamp (the
      // streak neither advances nor resets here). Note lastActiveAt doubles as
      // the "day already claimed" marker, so a failed FIRST attempt of the day
      // updates it and a later pass that same day won't re-claim the streak —
      // consistent with the sequential fail-then-pass case (no phantom reward;
      // newStreak isn't shown in the UI). Awarding the streak on the first PASS
      // regardless of an earlier fail needs a dedicated streak-day column →
      // migration; deferred (see .overnight/QUEUE.md).
      await tx.user.update({
        where: { id: userId },
        data: { lastActiveAt: now },
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath(`/exercises/${exerciseId}`);
  revalidatePath(`/exercises/${exercise.type}`);
  revalidatePath("/exercises/mistakes");

  return {
    ok: true,
    score,
    feedback,
    reward,
    // The streak reward actually granted this submission (flat daily + any
    // milestone bonus), or 0 if a concurrent submission already claimed the
    // day. Surfaced as one figure so the result badge's total includes the
    // milestone without UI changes.
    streakBonus: streakAwarded,
    newStreak,
    alreadyEarned,
    correctAnswer: local.correctAnswer,
    mismatches: local.mismatches,
    // A milestone was reached iff its bonus was actually awarded this attempt
    // (won the day → streakAwarded includes it).
    streakMilestone:
      milestoneBonus > 0 && streakAwarded > 0 ? newStreak : undefined,
  };
}

/**
 * Fetch a random PUBLISHED exercise of the given type. Optionally
 * filter by user level. Used by `/exercises/[type]` and the
 * "Next exercise" button to avoid handing back the same prompt twice.
 *
 * When {@link PREFER_UNSEEN_EXERCISES} is on and we can resolve the current
 * user, the draw prefers exercises they haven't already passed (score ≥ 60),
 * falling back to the full pool once everything of this type/level is mastered
 * so the "Next" stream never dead-ends. See `selection.ts` for the tiering.
 */
export async function getRandomExerciseOfType(
  type: ExerciseType,
  excludeId?: string,
  level?: CefrLevel,
): Promise<{ id: string } | null> {
  const session = await auth();
  const userId = session?.user?.id;

  const passedIds: string[] = [];
  const weakIds: string[] = [];
  if ((PREFER_UNSEEN_EXERCISES || PREFER_WEAK_EXERCISES) && userId) {
    // One grouped query gives the best-ever score per exercise of this
    // type/level, from which we split: passed (best >= 60) vs weak (attempted
    // but best < 60, i.e. never passed → a mistake worth resurfacing).
    const grouped = await prisma.userExercise.groupBy({
      by: ["exerciseId"],
      where: { userId, exercise: { type, ...(level ? { level } : {}) } },
      _max: { score: true },
    });
    for (const g of grouped) {
      if ((g._max.score ?? 0) >= 60) passedIds.push(g.exerciseId);
      else weakIds.push(g.exerciseId);
    }
  }

  // Try each tier (weak-first, then unseen, then the full pool) in order.
  for (const where of buildSelectionWheres(
    type,
    excludeId,
    level,
    passedIds,
    PREFER_UNSEEN_EXERCISES,
    weakIds,
  )) {
    const count = await prisma.exercise.count({ where });
    if (count === 0) continue;
    const skip = Math.floor(Math.random() * count);
    const [ex] = await prisma.exercise.findMany({
      where,
      skip,
      take: 1,
      select: { id: true },
    });
    if (ex) return ex;
  }

  // Cross-level fallback: when the user picked a level filter, respect it —
  // don't silently hand back an exercise from a different level. Only fall
  // back when we're cycling to "Next" without a level (excludeId is set).
  if (excludeId && !level) {
    const any = await prisma.exercise.findFirst({
      where: { type, status: "PUBLISHED" },
      select: { id: true },
    });
    return any;
  }
  return null;
}
