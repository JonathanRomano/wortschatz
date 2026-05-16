import {
  AI_MODEL_PRICING_MICROCENTS_PER_TOKEN,
  COMMENT_WORD_BLOCKLIST,
  type AiModelId,
  type Locale,
} from "./constants.js";

/**
 * Pick a localized string out of a Localized field (Exercise
 * `instructions` / `explanation`, intros, AI output). Falls back to
 * English, then to the first non-empty locale, then to "".
 *
 * Tolerates legacy plain-string rows by returning the string unchanged.
 */
export function pickLocalized(value: unknown, locale: Locale): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);

  const bag = value as Record<string, unknown>;
  const candidate = bag[locale];
  if (typeof candidate === "string" && candidate.length > 0) return candidate;
  if (typeof bag.en === "string" && bag.en.length > 0) return bag.en;
  for (const v of Object.values(bag)) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

/**
 * Check a comment body against the blocklist. Returns the offending
 * word, or null when clean. Case-insensitive, whitespace-normalized.
 */
export function findBlockedWord(content: string): string | null {
  const normalized = content.toLowerCase().replace(/\s+/g, " ").trim();
  for (const word of COMMENT_WORD_BLOCKLIST) {
    if (normalized.includes(word.toLowerCase())) return word;
  }
  return null;
}

/**
 * Convert (model, tokens) to integer microcents. Returns 0 with a
 * console.warn for unknown model ids so we never lose an AiUsage row on
 * a typo or a freshly-released model id we haven't priced yet.
 */
export function estimateCostMicrocents(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = AI_MODEL_PRICING_MICROCENTS_PER_TOKEN[model as AiModelId];
  if (!price) {
    console.warn(
      `[config] estimateCostMicrocents: no pricing entry for model "${model}" — recording cost as 0.`,
    );
    return 0;
  }
  return price.input * inputTokens + price.output * outputTokens;
}
