/**
 * GPT prompt — VERB_CONJUGATION.
 *
 * Runs under OpenAI JSON mode (the client sets response_format json_object),
 * so the word "JSON" must appear in the prompt. Output is enforced downstream
 * by the VerbConjugationContent / VerbConjugationSolution Zod schemas in
 * src/lib/exercises/schemas.ts. Exports a single `promptParts: PromptParts`.
 */
import type { PromptParts } from "../../shared/types";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce VERB_CONJUGATION exercises. You must respond with a single valid JSON object — no commentary.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for VERB_CONJUGATION:
- Pick verbs appropriate to the level (A1: common regular and high-frequency strong verbs; higher levels may use separable or irregular verbs).
- The conjugated form must be correct.
- For Perfekt, correctForm must include auxiliary + past participle (e.g. "habe gegessen", "bist gegangen").
- For Futur, correctForm must include auxiliary + infinitive (e.g. "werde essen", "wird schlafen").

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 768,
  instructions: ({ level, topic }) => `Produce ONE VERB_CONJUGATION exercise as a JSON object.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Required JSON shape:
{
  "title": "<short German title, e.g. 'Konjugation: ${topic}'>",
  "content": {
    "infinitive": "<German verb infinitive, e.g. 'essen'>",
    "pronoun": "<exactly one of: 'ich' | 'du' | 'er/sie/es' | 'wir' | 'ihr' | 'sie/Sie' — verbatim>",
    "tense": "<exactly one of: 'Präsens' | 'Präteritum' | 'Perfekt' | 'Futur' — verbatim, with umlauts>"
  },
  "solution": {
    "correctForm": "<complete conjugated form: Präsens/Präteritum → finite verb only (e.g. 'esse', 'aß'); Perfekt → auxiliary + participle (e.g. 'habe gegessen'); Futur → auxiliary + infinitive (e.g. 'werde essen')>"
  },
  "explanation": { "en": "...", "pt": "...", "tr": "...", "uk": "..." },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": { "en": "...", "pt": "...", "tr": "...", "uk": "..." }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest, basic vocabulary — common regular verbs and high-frequency strong verbs. A2: Perfekt and modal verbs allowed. B1: separable verbs, dative/accusative, wider vocabulary. B2: complex syntax, Konjunktiv, nuanced connectors, irregular strong verbs.
- pronoun must be exactly one of: "ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie".
- tense must be exactly one of: "Präsens", "Präteritum", "Perfekt", "Futur".
- correctForm must be the COMPLETE form — include the auxiliary for Perfekt and Futur.
- The tip must NOT reveal the answer — hint at the formation rule only.
- Title under 60 chars; each tip locale under ~120 chars.
- Vary structure and vocabulary from the recent examples above.`,
};
