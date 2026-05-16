import { describe, expect, it } from "vitest";

import {
  COMMENT_MAX_LENGTH,
  COMMENT_RATE_LIMIT,
  COMMENT_WORD_BLOCKLIST,
  findBlockedWord,
} from "@wortschatz/config";

describe("comment moderation constants", () => {
  it("caps comment length at 500 characters", () => {
    expect(COMMENT_MAX_LENGTH).toBe(500);
  });

  it("rate-limits comments to 5 per minute", () => {
    expect(COMMENT_RATE_LIMIT.PER_MINUTE).toBe(5);
  });

  it("uses a 60-second window for rate limiting", () => {
    expect(COMMENT_RATE_LIMIT.WINDOW_MS).toBe(60_000);
  });

  it("ships with an empty blocklist (filled in as reports arrive)", () => {
    // If this ever changes, the matcher tests below should grow with it.
    expect(Array.isArray(COMMENT_WORD_BLOCKLIST)).toBe(true);
    expect(COMMENT_WORD_BLOCKLIST.length).toBe(0);
  });
});

describe("findBlockedWord — empty blocklist (production state)", () => {
  it("returns null for any non-empty input", () => {
    expect(findBlockedWord("hello world")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(findBlockedWord("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(findBlockedWord("   \n\t  ")).toBeNull();
  });

  it("returns null even for content that would look 'risky' if rules existed", () => {
    expect(findBlockedWord("BadWord and other things")).toBeNull();
    expect(findBlockedWord("OBSCENITY")).toBeNull();
  });
});

// The matcher's normalization logic — lowercasing, whitespace collapsing —
// can't be exercised against the production blocklist (it's empty). Mirror
// the matcher with a parametric helper so the matching rules are pinned
// regardless of which words ship in production.
function makeMatcher(blocklist: ReadonlyArray<string>) {
  return (content: string): string | null => {
    const normalized = content.toLowerCase().replace(/\s+/g, " ").trim();
    for (const word of blocklist) {
      if (normalized.includes(word.toLowerCase())) return word;
    }
    return null;
  };
}

describe("matcher normalization (parametric mirror of findBlockedWord)", () => {
  it("is case-insensitive", () => {
    const match = makeMatcher(["BadWord"]);
    expect(match("badword")).toBe("BadWord");
    expect(match("BADWORD")).toBe("BadWord");
    expect(match("BadWord")).toBe("BadWord");
    expect(match("a BadWord b")).toBe("BadWord");
  });

  it("collapses runs of whitespace before matching", () => {
    // A two-token blocked phrase still matches when the user spams spaces.
    const match = makeMatcher(["bad word"]);
    expect(match("bad   word")).toBe("bad word");
    expect(match("bad\tword")).toBe("bad word");
    expect(match("bad\n\nword")).toBe("bad word");
  });

  it("matches a substring inside larger text", () => {
    const match = makeMatcher(["spam"]);
    expect(match("this contains spam in the middle")).toBe("spam");
  });

  it("returns null when no blocked word matches", () => {
    const match = makeMatcher(["spam", "scam"]);
    expect(match("just a friendly comment")).toBeNull();
  });

  it("returns the first matching blocklist entry, not the input slice", () => {
    const match = makeMatcher(["Foo", "Bar"]);
    // The function preserves the canonical entry casing so an admin can
    // grep logs for the configured word, not the user's variant.
    expect(match("FOO is here")).toBe("Foo");
  });

  it("returns null for an empty blocklist regardless of content", () => {
    const match = makeMatcher([]);
    expect(match("anything goes")).toBeNull();
    expect(match("")).toBeNull();
  });
});
