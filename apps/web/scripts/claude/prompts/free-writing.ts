/**
 * Claude prompt — FREE_WRITING.
 *
 * Each prompt file exports a single `promptParts: PromptParts`.
 * The output JSON is enforced downstream by the FreeWritingContent /
 * FreeWritingSolution Zod schemas in src/lib/exercises/schemas.ts —
 * keep this prompt's described shape in sync with those.
 *
 * FREE_WRITING is AI-graded — there is no single correct answer.
 * The solution carries only an optional rubric string.
 */
import type { PromptParts } from "../../shared/types";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce FREE_WRITING exercises. Respond with a single JSON object and nothing else — no prose, no markdown fences.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for FREE_WRITING:
- The writing prompt must be open-ended and level-appropriate; minWords must be realistic for the level.
- There is no single correct answer — provide a brief rubric instead.
- The rubric should name 2–3 concrete things a strong answer should include.

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1024,
  instructions: ({ level, topic }) => `Write ONE FREE_WRITING exercise.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Output a single JSON object with this exact shape:
{
  "title": "<short German title, e.g. 'Schreiben: ${topic}'>",
  "content": {
    "prompt": "<an open-ended German writing task tied to the topic and appropriate for the level>",
    "minWords": <integer — suggested values: A1 ~30, A2 ~40, B1 ~60, B2 ~80>
  },
  "solution": {
    "rubric": "<a short string naming 2–3 things a strong answer should include — omit the field entirely only if truly not useful>"
  },
  "explanation": {
    "en": "<one or two sentences explaining what writing skill or grammar structure the exercise practices>",
    "pt": "<same in Brazilian Portuguese>",
    "tr": "<same in Turkish>",
    "uk": "<same in Ukrainian>"
  },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": {
    "en": "<one short hint about useful structures or phrases for this level — do NOT write sample sentences that constitute an answer>",
    "pt": "<same idea in Brazilian Portuguese>",
    "tr": "<same idea in Turkish>",
    "uk": "<same idea in Ukrainian>"
  }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest present tense, basic vocabulary, very short task (~30 words). A2: Perfekt and modal verbs, slightly more complex task (~40 words). B1: subordinate clauses, dative/accusative, wider vocabulary, longer task (~60 words). B2: complex syntax, Konjunktiv, nuanced connectors, richer task (~80 words).
- The writing prompt must leave room for genuine learner expression — avoid yes/no tasks.
- The tip should nudge on helpful structures or connectors without writing the answer for the learner.
- Vary structure, vocabulary, and topic angle from the recent examples above.
- Keep the title under 60 chars and each tip locale under ~120 chars.`,
};
