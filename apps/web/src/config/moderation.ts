// Words the comment system refuses. Case-insensitive substring match
// on the lowercased trimmed content. Start empty; add to this list as
// reports come in. Each entry should also be the cleanest representation;
// the matcher normalizes whitespace and lowercases.
export const COMMENT_WORD_BLOCKLIST: ReadonlyArray<string> = [];

export const COMMENT_RATE_LIMIT = {
  PER_MINUTE: 5,
  WINDOW_MS: 60 * 1000,
} as const;

export const COMMENT_MAX_LENGTH = 500;

export function findBlockedWord(content: string): string | null {
  const normalized = content.toLowerCase().replace(/\s+/g, " ").trim();
  for (const word of COMMENT_WORD_BLOCKLIST) {
    if (normalized.includes(word.toLowerCase())) return word;
  }
  return null;
}
