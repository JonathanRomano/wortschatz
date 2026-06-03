/**
 * Claude prompt — ERROR_CORRECTION.
 *
 * Exports `promptParts` for the ERROR_CORRECTION exercise type. The
 * model produces a German sentence with exactly one realistic learner
 * error, the corrected version, and a brief description of the fix.
 * Output is enforced downstream by the ErrorCorrectionContent /
 * ErrorCorrectionSolution Zod schemas in src/lib/exercises/schemas.ts —
 * keep this prompt's described shape in sync with those.
 */
import type { PromptParts } from "../../prompt-types.js";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce ERROR_CORRECTION exercises. Respond with a single JSON object and nothing else — no prose, no markdown fences.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for ERROR_CORRECTION:
- The sentence must contain exactly ONE realistic learner error (wrong case, gender, verb conjugation, word order, or preposition). 'corrected' is the fully fixed sentence. 'errorDescription' briefly names the error and the fix.
- The error must be subtle enough to challenge the learner but grounded in a genuine mistake that CEFR learners at this level actually make.
- Do not introduce more than one error per sentence — the exercise tests focused correction, not proofreading.

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1024,
  instructions: ({ level, topic }) => `Write ONE ERROR_CORRECTION exercise.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Output a single JSON object with this exact shape:
{
  "title": "<short German title, e.g. 'Fehlerkorrektur: ${topic}'>",
  "content": {
    "sentence": "<a German sentence containing EXACTLY ONE grammatical error>"
  },
  "solution": {
    "corrected": "<the fully corrected German sentence>",
    "errorDescription": "<concise description of the error and its fix — may be in German, e.g. 'Akkusativ maskulin: «einen» statt «ein».'>"
  },
  "explanation": {
    "en": "<one or two sentences explaining the grammar rule that was violated>",
    "pt": "<same in Brazilian Portuguese>",
    "tr": "<same in Turkish>",
    "uk": "<same in Ukrainian>"
  },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": {
    "en": "<one short hint that nudges toward spotting the error WITHOUT naming it>",
    "pt": "<same idea in Brazilian Portuguese>",
    "tr": "<same idea in Turkish>",
    "uk": "<same idea in Ukrainian>"
  }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest present tense, basic vocabulary — errors on gender or verb ending. A2: Perfekt and modal verbs — errors on past participle or modal position. B1: subordinate clauses, dative/accusative — errors on case or verb-final placement. B2: complex syntax, Konjunktiv, nuanced prepositions — errors on Konjunktiv form or prepositional case.
- The sentence must contain EXACTLY ONE error. corrected must fix only that error and nothing else.
- errorDescription is a single concise string. Writing it in German is encouraged when that makes the grammatical term clearest.
- Vary structure and vocabulary from the recent examples above.
- The tip must NOT identify the error — hint at what to check ("look at the case of the noun after this preposition"), not the answer.
- Keep the title under 60 chars and each tip locale under ~120 chars.`,
};
