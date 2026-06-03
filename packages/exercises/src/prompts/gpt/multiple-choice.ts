/**
 * GPT prompt — MULTIPLE_CHOICE.
 *
 * Runs under OpenAI JSON mode (the client sets response_format
 * json_object), so the word "JSON" must appear in the system prompt and
 * the model will only emit a JSON object. Output is enforced downstream
 * by the MultipleChoiceContent / MultipleChoiceSolution Zod schemas.
 *
 * Exports `promptParts: PromptParts` — the shared builder injects the
 * recent-examples block between `instructions` and `jsonShape`.
 */
import type { PromptParts } from "../../prompt-types.js";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce MULTIPLE_CHOICE exercises. You must respond with a single valid JSON object — no commentary.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for MULTIPLE_CHOICE:
- All 4 options must be grammatically plausible — wrong answers are common learner mistakes, not nonsense. Exactly one option is correct.
- Wrong options should differ minimally from the correct one (wrong case, wrong tense, wrong modal) so the learner must understand the rule to succeed.

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1024,
  instructions: ({ level, topic }) => `Produce ONE MULTIPLE_CHOICE exercise as a JSON object.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Required JSON shape:
{
  "title": "<short German title, e.g. 'Wahl: ${topic}'>",
  "content": {
    "question": "<a German question or incomplete sentence prompting the learner to choose the correct option>",
    "options": ["<option A>", "<option B>", "<option C>", "<option D>"]   // exactly 4 items
  },
  "solution": {
    "correctIndex": <integer 0..3, the index of the correct option>
  },
  "explanation": { "en": "...", "pt": "...", "tr": "...", "uk": "..." },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": { "en": "...", "pt": "...", "tr": "...", "uk": "..." }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest present tense, basic vocabulary. A2: Perfekt and modal verbs allowed. B1: subordinate clauses, dative/accusative, wider vocabulary. B2: complex syntax, Konjunktiv, nuanced connectors.
- Vary structure and vocabulary from the recent examples above.
- The tip must NOT reveal or imply the correct answer — hint at structure only.
- Title under 60 chars; each tip locale under ~120 chars.
- The options array must contain exactly 4 strings.`,
};
