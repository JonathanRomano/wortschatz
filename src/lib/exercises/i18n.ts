import type { Locale } from "@/i18n/config";

export type LocalizedText = Partial<Record<Locale, string>>;

/**
 * Pick a localized string out of an Exercise `instructions` or
 * `explanation` JSON column. Falls back to English, then to the first
 * available locale, then to an empty string.
 *
 * Tolerates legacy rows where the column was a plain string by
 * returning that string unchanged.
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
