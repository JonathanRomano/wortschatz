/**
 * GPT prompt — TRANSLATION.
 *
 * Runs under OpenAI JSON mode (the client sets response_format
 * json_object), so the word "JSON" must appear in the system prompt and
 * the model will only emit a JSON object. The learner is given an English
 * sentence and translates it into German. Output is enforced downstream
 * by the TranslationContent / TranslationSolution Zod schemas.
 *
 * Exports a single `promptParts: PromptParts` (system / instructions /
 * jsonShape / rules); the shared builder injects the recent-examples block.
 */
import type { PromptParts } from "../../prompt-types.js";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce TRANSLATION exercises (English → German). You must respond with a single valid JSON object — no commentary.
The German translations must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for TRANSLATION:
- The German translations must use natural everyday phrasing, not literal back-translation. Include common acceptable variants (e.g. with and without contractions like 'ins'/'in das').
- Provide 2–4 accepted German translations that a native speaker would consider natural.

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1024,
  instructions: ({ level, topic }) => `Produce ONE TRANSLATION exercise (English → German) as a JSON object.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Required JSON shape:
{
  "title": "<short German title, e.g. 'Übersetzung: ${topic}'>",
  "content": {
    "sourceText": "<an English sentence the learner must translate into German>",
    "sourceLanguage": "en"
  },
  "solution": {
    "acceptedTranslations": ["<natural German rendering 1>", "<natural German rendering 2>", ...]   // 2–4 correct variants
  },
  "explanation": { "en": "...", "pt": "...", "tr": "...", "uk": "..." },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": { "en": "...", "pt": "...", "tr": "...", "uk": "..." }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest present tense, basic vocabulary. A2: Perfekt and modal verbs allowed. B1: subordinate clauses, dative/accusative, wider vocabulary. B2: complex syntax, Konjunktiv, nuanced connectors.
- Vary structure and vocabulary from the recent examples above.
- acceptedTranslations must include natural variants — e.g. 'ins Kino' alongside 'in das Kino' where both are idiomatic.
- The tip must NOT reveal any German words from the solution — hint at structure only.
- Title under 60 chars; each tip locale under ~120 chars.`,
};
