/**
 * Canonical topic list per CEFR level. When `--topic` is omitted the
 * runner cycles through the list for the chosen level, so a batch of N
 * spreads across several topics instead of hammering one.
 *
 * Levels beyond B2 fall back to the B2 list — the generators don't
 * target C1/C2 yet, but a missing key would otherwise throw.
 */
import type { CefrLevel } from "@wortschatz/database";

export const TOPICS_BY_LEVEL: Record<CefrLevel, string[]> = {
  A1: [
    // Cotidiano básico
    "greetings",
    "introducing-yourself",
    "family",
    "food-and-drinks",
    "numbers-and-prices",
    "colors-and-clothes",
    "days-months-seasons",
    "telling-time",
    "weather",
    "home-and-furniture",
    // Concretos com gramática embutida
    "body-parts",
    "describing-people",
    "daily-routine",
    "in-the-classroom",
    "at-the-supermarket",
    "asking-for-things",
    // Cultural leve
    "german-bakery",
    "public-transport-basics",
  ],
  A2: [
    // Vida prática
    "job-and-work-life",
    "shopping-and-clothes",
    "travel-and-vacation",
    "doctor-and-health",
    "hobbies-and-free-time",
    "asking-for-directions",
    "past-events",
    "future-plans",
    "making-appointments",
    "renting-an-apartment",
    "at-the-restaurant",
    "describing-your-city",
    // Situações específicas
    "weekend-activities",
    "ordering-online",
    "phone-calls",
    "small-talk-with-neighbors",
    // Cultural
    "german-holidays",
    "oktoberfest-and-traditions",
    "bürgeramt-and-paperwork",
  ],
  B1: [
    // Opiniões e situações sociais
    "personal-opinions",
    "current-news",
    "environment-and-climate",
    "education-and-school-system",
    "friendships-and-relationships",
    "german-culture-and-stereotypes",
    "technology-in-daily-life",
    "social-media",
    // Vida adulta
    "career-decisions",
    "moving-to-a-new-country",
    "managing-finances",
    "work-life-balance",
    "renting-vs-buying",
    "raising-children",
    "dealing-with-bureaucracy",
    // Concretos com complexidade
    "describing-a-conflict",
    "telling-a-story",
    "giving-advice",
    "expressing-regret",
    // Cultural
    "differences-between-germany-and-home-country",
    "integration-and-language-learning",
  ],
  B2: [
    // Abstrato e crítico
    "politics-and-elections",
    "ethics-and-dilemmas",
    "abstract-concepts",
    "professional-development",
    "argumentation-and-debate",
    "literature-and-reading",
    "history-and-memory",
    // Profundidade temática
    "ai-and-society",
    "future-of-work",
    "globalization",
    "immigration-debates",
    "gender-and-equality",
    "mental-health",
    "philosophy-of-everyday-life",
    // Profissional avançado
    "writing-formal-emails",
    "negotiating-and-persuading",
    "presenting-ideas",
    "giving-criticism-diplomatically",
    // Cultural específica
    "german-political-system",
    "regional-differences-in-germany",
    "post-reunification-germany",
  ],
  C1: [
    "politics",
    "abstract-concepts",
    "professional-life",
    "argumentation",
    "literature",
    "history",
    "ethics",
  ],
  C2: [
    "politics",
    "abstract-concepts",
    "professional-life",
    "argumentation",
    "literature",
    "history",
    "ethics",
  ],
};

/** Topic for iteration `i` when no explicit --topic was given. */
export function topicForIndex(level: CefrLevel, i: number): string {
  const list = TOPICS_BY_LEVEL[level];
  return list[i % list.length]!;
}
