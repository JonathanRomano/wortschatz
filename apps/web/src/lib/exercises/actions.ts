"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@wortschatz/database";
import { auth } from "@/auth";
import { gradeLocally } from "@/lib/exercises/grade";
import {
  evaluateAnswer,
  AI_CONFIGURED,
  AiRateLimitedError,
} from "@/lib/ai";
import {
  computeReward,
  credit,
  isSameCalendarDay,
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

  const { base, perfect, streakBonus } = alreadyEarned
    ? { base: 0, perfect: 0, streakBonus: 0 }
    : computeReward(score, isFirstOfDay, effectiveTipUsed);
  // The legacy `reward` surface in the SubmitResult bundles the
  // exercise-completion credit + perfect-score bonus into one figure for
  // the UI banner. We still write them as two separate transactions in
  // the DB so the history page can show them as distinct rows.
  const reward = base + perfect;

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
    await tx.user.update({
      where: { id: userId },
      data: { lastActiveAt: now, streak: newStreak },
    });
    if (base > 0) await credit(userId, base, "EXERCISE_COMPLETE", exerciseId, tx);
    if (perfect > 0) await credit(userId, perfect, "PERFECT_SCORE_BONUS", exerciseId, tx);
    if (streakBonus > 0) await credit(userId, streakBonus, "DAILY_STREAK", exerciseId, tx);
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
    streakBonus,
    newStreak,
    alreadyEarned,
  };
}

/**
 * Fetch a random PUBLISHED exercise of the given type. Optionally
 * filter by user level. Used by `/exercises/[type]` and the
 * "Next exercise" button to avoid handing back the same prompt twice.
 */
export async function getRandomExerciseOfType(
  type: ExerciseType,
  excludeId?: string,
  level?: CefrLevel,
): Promise<{ id: string } | null> {
  const where = {
    type,
    status: "PUBLISHED" as const,
    ...(excludeId ? { id: { not: excludeId } } : {}),
    ...(level ? { level } : {}),
  };

  const count = await prisma.exercise.count({ where });
  if (count === 0) {
    // When the user picked a level filter, respect it — don't silently
    // hand back an exercise from a different level. Only fall back when
    // we're cycling to "Next" without a level (excludeId is set).
    if (excludeId && !level) {
      const any = await prisma.exercise.findFirst({
        where: { type, status: "PUBLISHED" },
        select: { id: true },
      });
      return any;
    }
    return null;
  }

  const skip = Math.floor(Math.random() * count);
  const [ex] = await prisma.exercise.findMany({
    where,
    skip,
    take: 1,
    select: { id: true },
  });
  return ex ?? null;
}
