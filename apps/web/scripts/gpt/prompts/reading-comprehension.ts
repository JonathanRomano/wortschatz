/**
 * GPT prompt — READING_COMPREHENSION.
 *
 * Runs under OpenAI JSON mode (the client sets response_format json_object),
 * so the word "JSON" must appear in the prompt and the model will only emit
 * a JSON object. Output is enforced downstream by the
 * ReadingComprehensionContent / ReadingComprehensionSolution Zod schemas.
 *
 * Exports a single `promptParts: PromptParts`; the shared builder injects the
 * recent-examples block.
 */
import type { PromptParts } from "../../shared/types";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce READING_COMPREHENSION exercises. You must respond with a single valid JSON object — no commentary.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for READING_COMPREHENSION:
- The question must require comprehension, not just keyword spotting.
- The expected answer must be unambiguous and supported by the passage.
- A1: 2–3 simple sentences; B2: a richer paragraph with varied syntax and vocabulary.

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1536,
  instructions: ({ level, topic }) => `Produce ONE READING_COMPREHENSION exercise as a JSON object.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Required JSON shape:
{
  "title": "<short German title, e.g. 'Leseverständnis: ${topic}'>",
  "content": {
    "passage": "<a German text appropriate for the level — A1: 2–3 simple sentences; A2: 3–4 sentences; B1: short paragraph with subordinate clauses; B2: richer paragraph with complex syntax>",
    "question": "<a German question requiring genuine comprehension of the passage>"
  },
  "solution": {
    "expectedAnswer": "<a concise German answer supported by the passage>"
  },
  "explanation": { "en": "...", "pt": "...", "tr": "...", "uk": "..." },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": { "en": "...", "pt": "...", "tr": "...", "uk": "..." }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest present tense, basic vocab, short sentences. A2: Perfekt and modal verbs allowed. B1: subordinate clauses, dative/accusative, wider vocabulary. B2: complex syntax, Konjunktiv, nuanced connectors, richer paragraphs.
- The question must not be answerable by copying a single phrase — genuine comprehension required.
- The tip must NOT reveal the answer — nudge the learner toward where to look.
- Vary structure, vocabulary, and topic angle from the recent examples above.
- Title under 60 chars; each tip locale under ~120 chars.`,
};
