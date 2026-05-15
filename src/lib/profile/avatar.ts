// Avatar processing + validation helpers. Kept free of Next-runtime
// imports so the unit tests can hit them directly without spinning up
// a route handler.

import { randomBytes } from "node:crypto";
import sharp from "sharp";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AvatarAllowedMime = (typeof AVATAR_ALLOWED_MIME)[number];

export type AvatarValidationError =
  | "too_large"
  | "unsupported_mime"
  | "invalid_image";

// Resized square dimension. Avatars are decorative — 512px is plenty
// even on retina screens at the dashboard hero size (96px).
const AVATAR_SIZE = 512;

// Public URL prefix for stored avatars. Kept here so callers (route
// handler + cleanup helpers) agree on a single string. Anything stored
// under this prefix is considered "owned" by the upload flow and is
// fair game for best-effort cleanup.
export const AVATAR_URL_PREFIX = "/uploads/avatars/";

/**
 * First-pass synchronous validation. Catches the cheap cases (size,
 * declared mime) before we spend cycles decoding the image. Returns
 * `null` when the file passes both checks.
 */
export function validateAvatarUpload(
  file: File,
): AvatarValidationError | null {
  if (file.size > AVATAR_MAX_BYTES) return "too_large";
  if (!isAllowedMime(file.type)) return "unsupported_mime";
  return null;
}

function isAllowedMime(mime: string): mime is AvatarAllowedMime {
  return (AVATAR_ALLOWED_MIME as readonly string[]).includes(mime);
}

/**
 * Second-pass validation. Decodes the buffer with sharp and confirms
 * the actual format matches the declared mime. Protects against the
 * "rename evil.exe to evil.png" trick.
 */
export async function verifyImageFormat(
  buffer: Buffer,
  declaredMime: string,
): Promise<AvatarValidationError | null> {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.format) return "invalid_image";
    // sharp normalizes format to a lowercase short name. JPEG arrives
    // as "jpeg" rather than "jpg" so we can compare directly.
    const expectedFormat = declaredMime.replace(/^image\//, "");
    if (meta.format !== expectedFormat) return "invalid_image";
    return null;
  } catch {
    return "invalid_image";
  }
}

/**
 * Normalize an arbitrary input image into a 512×512 WebP. `rotate()` is
 * critical: phone cameras embed an EXIF orientation flag, and dropping
 * the metadata (which the WebP encoder does by default) without first
 * applying it leaves the image visibly sideways.
 */
export async function processAvatarBuffer(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
    .webp({ quality: 88 })
    .toBuffer();
}

/**
 * Build a stable-but-unguessable filename. The random suffix makes the
 * URL hard to guess (no enumeration of other users' avatars by id) and
 * acts as a cache-buster when the user uploads a new image.
 */
export function buildAvatarFilename(userId: string): string {
  const suffix = randomBytes(6).toString("hex");
  return `${userId}-${suffix}.webp`;
}

/**
 * True when the provided URL was written by our own upload flow and is
 * therefore safe to attempt to unlink. Anything from a third party
 * (Google OAuth `image`, the old `image` field, etc.) is left alone.
 */
export function isLocalAvatarUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith(AVATAR_URL_PREFIX);
}
