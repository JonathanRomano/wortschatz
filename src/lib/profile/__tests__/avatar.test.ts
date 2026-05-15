import { describe, it, expect } from "vitest";
import sharp from "sharp";

import {
  AVATAR_ALLOWED_MIME,
  AVATAR_MAX_BYTES,
  buildAvatarFilename,
  isLocalAvatarUrl,
  processAvatarBuffer,
  validateAvatarUpload,
  verifyImageFormat,
} from "@/lib/profile/avatar";

// Small helper: jsdom's File constructor sets `size` to whatever the
// blob parts add up to. Pass a Uint8Array of the desired byte length to
// get a deterministic `.size`.
function makeFile(bytes: number, mime: string): File {
  const data = new Uint8Array(bytes);
  return new File([data], "avatar", { type: mime });
}

describe("AVATAR_MAX_BYTES", () => {
  it("is exactly 2 MB", () => {
    expect(AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(AVATAR_MAX_BYTES).toBe(2_097_152);
  });
});

describe("AVATAR_ALLOWED_MIME", () => {
  it("contains exactly the four expected MIMEs", () => {
    expect(AVATAR_ALLOWED_MIME).toHaveLength(4);
    expect(Array.from(AVATAR_ALLOWED_MIME).sort()).toEqual(
      ["image/gif", "image/jpeg", "image/png", "image/webp"].sort(),
    );
  });
});

describe("validateAvatarUpload", () => {
  it("returns null for a valid 100-byte jpeg", () => {
    expect(validateAvatarUpload(makeFile(100, "image/jpeg"))).toBeNull();
  });

  it("returns null at the exact size boundary (2 MB)", () => {
    expect(
      validateAvatarUpload(makeFile(AVATAR_MAX_BYTES, "image/png")),
    ).toBeNull();
  });

  it("returns 'too_large' for a 2 MB + 1 byte file", () => {
    expect(
      validateAvatarUpload(makeFile(AVATAR_MAX_BYTES + 1, "image/png")),
    ).toBe("too_large");
  });

  it("returns 'unsupported_mime' for application/pdf", () => {
    expect(validateAvatarUpload(makeFile(100, "application/pdf"))).toBe(
      "unsupported_mime",
    );
  });

  it("returns 'unsupported_mime' for an empty mime", () => {
    expect(validateAvatarUpload(makeFile(100, ""))).toBe("unsupported_mime");
  });

  it("size check runs before mime check (too_large wins)", () => {
    // Both invalid: the size check is short-circuited first.
    expect(
      validateAvatarUpload(makeFile(AVATAR_MAX_BYTES + 1, "application/pdf")),
    ).toBe("too_large");
  });
});

describe("buildAvatarFilename", () => {
  it("matches the <userId>-<12hex>.webp format", () => {
    const name = buildAvatarFilename("user_abc");
    expect(name).toMatch(/^user_abc-[0-9a-f]{12}\.webp$/);
  });

  it("produces a different random suffix on each call", () => {
    const a = buildAvatarFilename("u");
    const b = buildAvatarFilename("u");
    const c = buildAvatarFilename("u");
    // 48 bits of randomness — collisions in three calls are vanishingly
    // unlikely; if this ever flakes, the RNG is broken, not the test.
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("handles a cuid-like userId without mangling characters", () => {
    const cuid = "clx9k4r2a0000abcd1234efgh";
    const name = buildAvatarFilename(cuid);
    expect(name.startsWith(`${cuid}-`)).toBe(true);
    expect(name.endsWith(".webp")).toBe(true);
    expect(name).toMatch(
      /^clx9k4r2a0000abcd1234efgh-[0-9a-f]{12}\.webp$/,
    );
  });
});

describe("isLocalAvatarUrl", () => {
  it("returns true for paths under /uploads/avatars/", () => {
    expect(isLocalAvatarUrl("/uploads/avatars/abc.webp")).toBe(true);
    expect(isLocalAvatarUrl("/uploads/avatars/u-1234.webp")).toBe(true);
  });

  it("returns false for absolute third-party URLs", () => {
    expect(isLocalAvatarUrl("https://example.com/avatar.png")).toBe(false);
    expect(
      isLocalAvatarUrl("https://lh3.googleusercontent.com/a/AC.png"),
    ).toBe(false);
  });

  it("returns false for null / undefined / empty string", () => {
    expect(isLocalAvatarUrl(null)).toBe(false);
    expect(isLocalAvatarUrl(undefined)).toBe(false);
    expect(isLocalAvatarUrl("")).toBe(false);
  });

  it("returns false for other local paths", () => {
    expect(isLocalAvatarUrl("/uploads/other/file.webp")).toBe(false);
    expect(isLocalAvatarUrl("/static/foo.png")).toBe(false);
  });
});

describe("verifyImageFormat", () => {
  it("resolves null when the format matches a real PNG buffer", async () => {
    const buf = await sharp({
      create: { width: 1, height: 1, channels: 4, background: "red" },
    })
      .png()
      .toBuffer();
    expect(await verifyImageFormat(buf, "image/png")).toBeNull();
  });

  it("resolves 'invalid_image' on mime mismatch (PNG buffer claiming JPEG)", async () => {
    const buf = await sharp({
      create: { width: 1, height: 1, channels: 4, background: "red" },
    })
      .png()
      .toBuffer();
    expect(await verifyImageFormat(buf, "image/jpeg")).toBe("invalid_image");
  });

  it("resolves 'invalid_image' for non-image bytes (sharp throws)", async () => {
    const buf = Buffer.from("not an image at all, just a plain string");
    expect(await verifyImageFormat(buf, "image/png")).toBe("invalid_image");
  });

  it("verifies a JPEG buffer correctly", async () => {
    const buf = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "blue" },
    })
      .jpeg()
      .toBuffer();
    expect(await verifyImageFormat(buf, "image/jpeg")).toBeNull();
  });

  it("verifies a WebP buffer correctly", async () => {
    const buf = await sharp({
      create: { width: 1, height: 1, channels: 4, background: "green" },
    })
      .webp()
      .toBuffer();
    expect(await verifyImageFormat(buf, "image/webp")).toBeNull();
  });
});

describe("processAvatarBuffer", () => {
  it("produces a 512x512 WebP from a 1024x768 PNG", async () => {
    const input = await sharp({
      create: {
        width: 1024,
        height: 768,
        channels: 4,
        background: { r: 200, g: 100, b: 50, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const output = await processAvatarBuffer(input);
    const meta = await sharp(output).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it("produces a 512x512 WebP from a portrait 480x640 JPEG", async () => {
    const input = await sharp({
      create: {
        width: 480,
        height: 640,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .jpeg()
      .toBuffer();

    const output = await processAvatarBuffer(input);
    const meta = await sharp(output).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it("strips EXIF metadata on its way to WebP", async () => {
    // Sharp's `withMetadata` is the only way to embed EXIF; pin that the
    // default pipeline drops it. We attach an Orientation tag and confirm
    // the encoder doesn't carry it across.
    const input = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .withExif({ IFD0: { Software: "wortschatz-test", Orientation: "1" } })
      .jpeg()
      .toBuffer();

    const inputMeta = await sharp(input).metadata();
    // Sanity-check: the input genuinely carries EXIF before we process it.
    // (If this ever fails, the sharp API changed and the assertion below
    // would also become meaningless.)
    expect(inputMeta.exif).toBeDefined();

    const output = await processAvatarBuffer(input);
    const outMeta = await sharp(output).metadata();

    expect(outMeta.format).toBe("webp");
    // WebP encoder drops EXIF unless `.withMetadata()` is called.
    expect(outMeta.exif).toBeUndefined();
  });
});
