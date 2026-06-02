/**
 * Claude prompt — READING_COMPREHENSION.
 *
 * Each prompt file exports a single `promptParts: PromptParts`.
 * The output JSON is enforced downstream by the ReadingComprehensionContent /
 * ReadingComprehensionSolution Zod schemas in src/lib/exercises/schemas.ts —
 * keep this prompt's described shape in sync with those.
 */
import type { PromptParts } from "../../shared/types";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce READING_COMPREHENSION exercises. Respond with a single JSON object and nothing else — no prose, no markdown fences.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for READING_COMPREHENSION:
- The question must require comprehension, not just keyword spotting.
- The expected answer must be unambiguous and supported by the passage.
- A1: 2–3 simple sentences; B2: a richer paragraph with varied syntax and vocabulary.

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1536,
  instructions: ({ level, topic }) => `Write ONE READING_COMPREHENSION exercise.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Output a single JSON object with this exact shape:
{
  "title": "<short German title, e.g. 'Leseverständnis: ${topic}'>",
  "content": {
    "passage": "<a German text appropriate for the level — A1: 2–3 simple sentences; A2: 3–4 sentences with Perfekt/modal verbs; B1: a short paragraph with subordinate clauses; B2: a richer paragraph with complex syntax>",
    "question": "<a German question about the passage that requires genuine comprehension>"
  },
  "solution": {
    "expectedAnswer": "<a concise German answer supported directly by the passage>"
  },
  "explanation": {
    "en": "<one or two sentences explaining what reading skill or grammar point the exercise practices>",
    "pt": "<same in Brazilian Portuguese>",
    "tr": "<same in Turkish>",
    "uk": "<same in Ukrainian>"
  },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": {
    "en": "<one short hint that nudges the learner toward the answer WITHOUT revealing it>",
    "pt": "<same idea in Brazilian Portuguese>",
    "tr": "<same idea in Turkish>",
    "uk": "<same idea in Ukrainian>"
  }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest present tense, basic vocabulary, very short sentences. A2: Perfekt and modal verbs, slightly longer texts. B1: subordinate clauses, dative/accusative, wider vocabulary, longer texts. B2: complex syntax, Konjunktiv, nuanced connectors, richer paragraphs.
- The question must not be answerable by copying a single phrase — the learner must understand the passage.
- The expectedAnswer must be traceable to a specific part of the passage.
- Vary structure, vocabulary, and topic angle from the recent examples above.
- Keep the title under 60 chars and each tip locale under ~120 chars.`,
};
