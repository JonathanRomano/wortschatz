/**
 * Professions — the "Beruf" pivot (Sprint 05).
 *
 * The user picks their profession on the profile; exercises reach them
 * through tags on the existing `Exercise.tags` column. A profession tag
 * is the slug behind the `beruf:` prefix (e.g. `"beruf:pflege"`); track
 * units add a second `unit:<slug>` tag. Slugs are config-validated
 * strings rather than a Prisma enum so adding a profession never needs
 * a migration — the same reasoning as `User.nativeLanguage`.
 *
 * Display names and descriptions live in `messages/*.json` under
 * `professions` / `professionDescriptions` — never here, never in the
 * DB. Icons live in the web `ProfessionChip` component.
 */

export const PROFESSION_TAG_PREFIX = "beruf:";
export const UNIT_TAG_PREFIX = "unit:";

export const PROFESSION_SLUGS = [
  "pflege", // healthcare / care work
  "it", // IT / engineering
  "gastro", // hospitality / gastronomy
  "handwerk", // construction / trades / logistics
] as const;

export type ProfessionSlug = (typeof PROFESSION_SLUGS)[number];

export function isProfessionSlug(value: unknown): value is ProfessionSlug {
  return (
    typeof value === "string" &&
    (PROFESSION_SLUGS as readonly string[]).includes(value)
  );
}

/** `"pflege"` → `"beruf:pflege"` — the tag stored on `Exercise.tags`. */
export function professionTag(slug: ProfessionSlug): string {
  return `${PROFESSION_TAG_PREFIX}${slug}`;
}

/** `"uebergabe"` → `"unit:uebergabe"` — ties an exercise to a track unit. */
export function unitTag(unitSlug: string): string {
  return `${UNIT_TAG_PREFIX}${unitSlug}`;
}

/**
 * Extract the (validated) profession slugs out of an exercise's tags
 * array. Unknown `beruf:` tags are ignored rather than surfaced — a
 * removed profession must not break rendering of old rows.
 */
export function professionsFromTags(tags: readonly string[]): ProfessionSlug[] {
  const found: ProfessionSlug[] = [];
  for (const tag of tags) {
    if (!tag.startsWith(PROFESSION_TAG_PREFIX)) continue;
    const slug = tag.slice(PROFESSION_TAG_PREFIX.length);
    if (isProfessionSlug(slug) && !found.includes(slug)) found.push(slug);
  }
  return found;
}

/** Extract the unit slug from an exercise's tags (first `unit:` tag wins). */
export function unitFromTags(tags: readonly string[]): string | null {
  const tag = tags.find((t) => t.startsWith(UNIT_TAG_PREFIX));
  return tag ? tag.slice(UNIT_TAG_PREFIX.length) : null;
}
