// Toggle a like on a comment.
//
// The (commentId, userId) composite unique guarantees we never store
// two likes from the same user. Two concurrent POSTs from the same
// user could both observe "no row" and both try to create — the unique
// index catches the loser. We swallow that one specific error so the
// caller sees a consistent { liked, likeCount } shape regardless of
// who won the race.

import { NextResponse } from "next/server";
import { Prisma } from "@wortschatz/database";

import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return errorResponse("unauthorized", 401);
  const userId = session.user.id;

  // Confirm the comment exists and isn't soft-deleted before we touch
  // any like rows. Deleted comments shouldn't accept new likes.
  const comment = await prisma.exerciseComment.findUnique({
    where: { id },
    select: { id: true, deletedAt: true },
  });
  if (!comment || comment.deletedAt) return errorResponse("not_found", 404);

  let liked: boolean;
  try {
    liked = await prisma.$transaction(async (tx) => {
      const existing = await tx.commentLike.findUnique({
        where: { commentId_userId: { commentId: id, userId } },
        select: { id: true },
      });
      if (existing) {
        await tx.commentLike.delete({ where: { id: existing.id } });
        return false;
      }
      await tx.commentLike.create({ data: { commentId: id, userId } });
      return true;
    });
  } catch (err) {
    // Concurrent toggle: another tab/request beat us to the create.
    // Treat that as "now liked" since the row exists, then return a
    // fresh count below. Any other Prisma error rethrows.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      liked = true;
    } else {
      throw err;
    }
  }

  const likeCount = await prisma.commentLike.count({
    where: { commentId: id },
  });
  return NextResponse.json({ liked, likeCount });
}
