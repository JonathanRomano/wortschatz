/**
 * GPT prompt — FREE_WRITING.
 *
 * Runs under OpenAI JSON mode (the client sets response_format json_object),
 * so the word "JSON" must appear in the prompt and the model will only emit
 * a JSON object. Output is enforced downstream by the FreeWritingContent /
 * FreeWritingSolution Zod schemas.
 *
 * FREE_WRITING is AI-graded — there is no single correct answer.
 * The solution carries only an optional rubric string.
 *
 * Exports `promptParts` (the shared builder injects the recent-examples block).
 */
import type { PromptParts } from "../../shared/types";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce FREE_WRITING exercises. You must respond with a single valid JSON object — no commentary.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for FREE_WRITING:
- The writing prompt must be open-ended and level-appropriate; minWords must be realistic for the level.
- There is no single correct answer — provide a brief rubric instead.
- The rubric should name 2–3 concrete things a strong answer should include.

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1024,
  instructions: ({ level, topic }) => `Produce ONE FREE_WRITING exercise as a JSON object.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Required JSON shape:
{
  "title": "<short German title, e.g. 'Schreiben: ${topic}'>",
  "content": {
    "prompt": "<an open-ended German writing task tied to the topic and appropriate for the level>",
    "minWords": <integer — A1 ~30, A2 ~40, B1 ~60, B2 ~80>
  },
  "solution": {
    "rubric": "<a short string naming 2–3 things a strong answer should include; omit only if truly not useful>"
  },
  "explanation": { "en": "...", "pt": "...", "tr": "...", "uk": "..." },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": { "en": "...", "pt": "...", "tr": "...", "uk": "..." }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest present tense, basic vocab, short task (~30 words). A2: Perfekt and modal verbs allowed (~40 words). B1: subordinate clauses, dative/accusative, wider vocabulary (~60 words). B2: complex syntax, Konjunktiv, nuanced connectors (~80 words).
- The writing prompt must be open-ended — avoid yes/no tasks.
- The tip should nudge on helpful structures or connectors without writing the answer.
- Vary structure, vocabulary, and topic angle from the recent examples above.
- Title under 60 chars; each tip locale under ~120 chars.`,
};
