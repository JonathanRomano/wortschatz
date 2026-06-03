/**
 * GPT prompt — FILL_IN_THE_BLANK.
 *
 * Reference implementation for the GPT per-type prompt contract. Runs
 * under OpenAI JSON mode (the client sets response_format json_object),
 * so the word "JSON" must appear in the prompt and the model will only
 * emit a JSON object. Each prompt file exports a `promptParts: PromptParts`
 * split into four pieces: `system` + `instructions` are the editable
 * "voice"; `jsonShape` + `rules` are LOCKED. Output is enforced downstream
 * by the FillInTheBlankContent / FillInTheBlankSolution Zod schemas plus
 * the blank-count check in shared/validate.ts.
 */
import type { PromptParts } from "../../prompt-types.js";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce FILL_IN_THE_BLANK exercises. You must respond with a single valid JSON object — no commentary.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for FILL_IN_THE_BLANK:
- The blank must target a specific grammatical decision (case, tense, gender, conjugation, preposition) — never a random vocabulary word.
- Mark each blank with exactly three underscores '___'. Prefer a single blank; use more only to reinforce one point.
- Include 'hint' only when it genuinely helps; otherwise omit the field.

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1024,
  instructions: ({ level, topic }) => `Produce ONE FILL_IN_THE_BLANK exercise as a JSON object.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Required JSON shape:
{
  "title": "<short German title, e.g. 'Lückentext: ${topic}'>",
  "content": {
    "sentence": "<a German sentence with each blank marked by exactly three underscores '___'>",
    "blanksCount": <integer equal to the number of '___' markers>,
    "hint": "<optional short hint; omit the field entirely if not useful>"
  },
  "solution": {
    "blanks": ["<answer for blank 1>", ...]   // length === blanksCount, left-to-right
  },
  "explanation": { "en": "...", "pt": "...", "tr": "...", "uk": "..." },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": { "en": "...", "pt": "...", "tr": "...", "uk": "..." }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: 4–8 words, simple present. A2: Perfekt and modal verbs allowed. B1: subordinate clauses, dative/accusative, wider vocabulary. B2: complex syntax, Konjunktiv, nuanced connectors.
- Vary the grammatical focus from the recent examples above.
- The tip must NOT reveal the answer — hint at structure only.
- Title under 60 chars; each tip locale under ~120 chars.`,
};
