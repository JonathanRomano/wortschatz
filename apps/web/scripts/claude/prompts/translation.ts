/**
 * Claude prompt — TRANSLATION.
 *
 * Exports a single `promptParts: PromptParts`. The learner is given an
 * English sentence and must translate it into German. Output is enforced
 * downstream by the TranslationContent / TranslationSolution Zod schemas
 * in src/lib/exercises/schemas.ts — keep this prompt's described shape in
 * sync with those.
 */
import type { PromptParts } from "../../shared/types";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce TRANSLATION exercises (English → German). Respond with a single JSON object and nothing else — no prose, no markdown fences.
The German translations must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for TRANSLATION:
- The German translations must use natural everyday phrasing, not literal back-translation. Include common acceptable variants (e.g. with and without contractions like 'ins'/'in das').
- Provide 2–4 accepted German translations that a native speaker would consider natural.
- The English source sentence should target a concrete grammatical or vocabulary point (not random small talk).

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1024,
  instructions: ({ level, topic }) => `Write ONE TRANSLATION exercise (English → German).

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Output a single JSON object with this exact shape:
{
  "title": "<short German title, e.g. 'Übersetzung: ${topic}'>",
  "content": {
    "sourceText": "<an English sentence the learner must translate into German>",
    "sourceLanguage": "en"
  },
  "solution": {
    "acceptedTranslations": ["<natural German rendering 1>", "<natural German rendering 2>", ...]   // 2–4 correct variants
  },
  "explanation": {
    "en": "<one or two sentences explaining the key grammar/vocab point the exercise targets>",
    "pt": "<same in Brazilian Portuguese>",
    "tr": "<same in Turkish>",
    "uk": "<same in Ukrainian>"
  },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": {
    "en": "<one short hint that nudges toward the correct structure WITHOUT revealing the German translation>",
    "pt": "<same idea in Brazilian Portuguese>",
    "tr": "<same idea in Turkish>",
    "uk": "<same idea in Ukrainian>"
  }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest present tense, basic vocabulary. A2: Perfekt and modal verbs allowed. B1: subordinate clauses, dative/accusative, wider vocabulary. B2: complex syntax, Konjunktiv, nuanced connectors.
- Vary structure and vocabulary from the recent examples above.
- acceptedTranslations must include natural variants — e.g. 'ins Kino' alongside 'in das Kino' where both are idiomatic.
- The tip must NOT contain any German words from the solution. Hint at structure ("think about word order in a subordinate clause"), not the answer.
- Keep the title under 60 chars and each tip locale under ~120 chars.`,
};
