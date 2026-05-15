"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { reviewText, AiRateLimitedError } from "@/lib/ai";
import { debit, InsufficientFundsError, MUENZEN_RULES } from "@/lib/muenzen";

export type ReviewResult =
  | { ok: true; feedback: string; remainingMuenzen: number }
  | {
      ok: false;
      error:
        | "insufficient_funds"
        | "not_authenticated"
        | "empty"
        | "rate_limited";
    };

export async function submitReviewRequest(text: string): Promise<ReviewResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };
  const userId = session.user.id;
  const trimmed = text.trim();
  if (trimmed.length < 5) return { ok: false, error: "empty" };

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { muenzen: true, preferredLanguage: true },
  });

  // Cheap pre-check; the debit transaction repeats it atomically.
  if (user.muenzen < MUENZEN_RULES.aiReviewCost) {
    return { ok: false, error: "insufficient_funds" };
  }

  // We default user level to B1 for the AI prompt — once we track level
  // explicitly on the User model, swap that in here. Pass userId so the
  // call counts against the user's daily quota.
  let ai;
  try {
    ai = await reviewText(trimmed, "B1", userId);
  } catch (err) {
    if (err instanceof AiRateLimitedError) {
      return { ok: false, error: "rate_limited" };
    }
    throw err;
  }

  try {
    await debit(userId, MUENZEN_RULES.aiReviewCost, "SPENT_AI_REVIEW");
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return { ok: false, error: "insufficient_funds" };
    }
    throw err;
  }

  const created = await prisma.aIReviewRequest.create({
    data: {
      userId,
      inputText: trimmed,
      feedback: ai.feedback,
      muenzenCost: MUENZEN_RULES.aiReviewCost,
    },
  });

  // Backfill the transaction's refId now that we have the request ID.
  await prisma.muenzenTransaction.updateMany({
    where: { userId, reason: "SPENT_AI_REVIEW", refId: null },
    data: { refId: created.id },
  });

  revalidatePath("/review");
  revalidatePath("/dashboard");

  const after = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { muenzen: true },
  });
  return { ok: true, feedback: ai.feedback, remainingMuenzen: after.muenzen };
}
