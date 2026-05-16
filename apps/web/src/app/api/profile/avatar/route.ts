// Avatar upload + delete endpoint.
//
// TODO(storage): files are written to `public/uploads/avatars/` on the
// local filesystem. This works for dev and simple self-hosted deploys
// but is _not_ safe on ephemeral hosts (Vercel, Netlify) where the
// filesystem is wiped on each deploy and isn't shared across instances.
// Swap for Vercel Blob / S3 before deploying there — the validation +
// sharp pipeline stays the same, only the write/unlink section
// (`writeFile` / `unlink` + `avatarUrl` construction) needs to move.

import { NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  AVATAR_URL_PREFIX,
  buildAvatarFilename,
  isLocalAvatarUrl,
  processAvatarBuffer,
  validateAvatarUpload,
  verifyImageFormat,
} from "@/lib/profile/avatar";

// Resolve once at module load so we don't recompute on every request.
// `process.cwd()` is the Next.js project root at runtime.
const AVATAR_DIR = join(process.cwd(), "public", "uploads", "avatars");

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("unauthorized", 401);
  }
  const userId = session.user.id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("invalid_form", 400);
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("missing_file", 400);
  }

  // Cheap checks first (size + declared mime) — saves us decoding 2 MB
  // of garbage just to find out it's a PDF.
  const cheapError = validateAvatarUpload(file);
  if (cheapError === "too_large") return errorResponse("too_large", 413);
  if (cheapError === "unsupported_mime") {
    return errorResponse("unsupported_mime", 415);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Defense against mime spoofing: re-decode the buffer and compare
  // sharp's detected format against the declared mime.
  const formatError = await verifyImageFormat(buffer, file.type);
  if (formatError) return errorResponse(formatError, 400);

  let processed: Buffer;
  try {
    processed = await processAvatarBuffer(buffer);
  } catch {
    return errorResponse("invalid_image", 400);
  }

  const filename = buildAvatarFilename(userId);
  const fsPath = join(AVATAR_DIR, filename);
  const publicUrl = `${AVATAR_URL_PREFIX}${filename}`;

  // Ensure the directory exists. `mkdir -p` semantics — safe to call
  // repeatedly. Without this the first upload on a fresh checkout
  // would fail before the .gitkeep ships.
  await mkdir(AVATAR_DIR, { recursive: true });
  await writeFile(fsPath, processed);

  // Best-effort cleanup of the previous avatar so old files don't pile
  // up. We only touch URLs we know we wrote (the `AVATAR_URL_PREFIX`
  // check) — never the user's Google OAuth image.
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });
  if (existing?.avatarUrl && isLocalAvatarUrl(existing.avatarUrl)) {
    const oldFilename = existing.avatarUrl.slice(AVATAR_URL_PREFIX.length);
    // Guard against path-traversal in stored values. Reject both
    // embedded slashes and "..": either could escape AVATAR_DIR.
    if (
      oldFilename &&
      !oldFilename.includes("/") &&
      !oldFilename.includes("..")
    ) {
      await unlink(join(AVATAR_DIR, oldFilename)).catch(() => {});
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: publicUrl },
  });

  return NextResponse.json({ ok: true, avatarUrl: publicUrl });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("unauthorized", 401);
  }
  const userId = session.user.id;

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  if (existing?.avatarUrl && isLocalAvatarUrl(existing.avatarUrl)) {
    const oldFilename = existing.avatarUrl.slice(AVATAR_URL_PREFIX.length);
    if (
      oldFilename &&
      !oldFilename.includes("/") &&
      !oldFilename.includes("..")
    ) {
      await unlink(join(AVATAR_DIR, oldFilename)).catch(() => {});
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ ok: true });
}
