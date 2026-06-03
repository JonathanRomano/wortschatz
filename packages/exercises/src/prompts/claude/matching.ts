/**
 * Claude prompt — MATCHING.
 *
 * Exports `promptParts` for the MATCHING exercise type. The output JSON is
 * enforced downstream by the MatchingContent / MatchingSolution Zod schemas
 * in src/lib/exercises/schemas.ts — keep this prompt's described shape in
 * sync with those.
 */
import type { PromptParts } from "../../prompt-types.js";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce MATCHING exercises. Respond with a single JSON object and nothing else — no prose, no markdown fences.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for MATCHING:
- Pairs must be unambiguous and one-to-one — no two German words share a translation.
- Use 3–6 pairs, thematically tied to the topic.
- The translations array contains English equivalents (the learner's interface language for seeds).

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 768,
  instructions: ({ level, topic }) => `Write ONE MATCHING exercise.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Output a single JSON object with this exact shape:
{
  "title": "<short German title, e.g. 'Zuordnung: ${topic}'>",
  "content": {
    "german": ["<word 1>", "<word 2>", ...],          // 3–6 German words, same length as translations
    "translations": ["<English 1>", "<English 2>", ...] // English translation for each word, same order
  },
  "solution": {
    "pairs": {
      "<german word 1>": "<its English translation>",
      "<german word 2>": "<its English translation>",
      ...
    }
  },
  "explanation": {
    "en": "<one or two sentences explaining the vocabulary or grammar theme>",
    "pt": "<same in Brazilian Portuguese>",
    "tr": "<same in Turkish>",
    "uk": "<same in Ukrainian>"
  },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": {
    "en": "<one short hint that helps the learner approach the matching WITHOUT revealing any pair>",
    "pt": "<same idea in Brazilian Portuguese>",
    "tr": "<same idea in Turkish>",
    "uk": "<same idea in Ukrainian>"
  }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest, basic vocabulary. A2: Perfekt and modal verbs in context, common collocations. B1: subordinate clauses context, dative/accusative, wider vocabulary. B2: complex syntax, Konjunktiv, nuanced connectors.
- german.length must equal translations.length (3–6 items each).
- Every entry in german must appear as a key in solution.pairs, mapped to its exact English translation from the translations array.
- The values in solution.pairs must be exactly the entries from the translations array — no paraphrasing.
- No two German words may map to the same English translation.
- The tip must NOT reveal any specific pair. Hint at a strategy ("look for cognates" or "think about word families"), not the answers.
- Keep the title under 60 chars and each tip locale under ~120 chars.
- Vary structure and vocabulary from the recent examples above.`,
};
