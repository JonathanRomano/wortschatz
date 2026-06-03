/**
 * GPT prompt — WORD_ORDER.
 *
 * Exports `promptParts` for the WORD_ORDER exercise type. Runs under
 * OpenAI JSON mode (the client sets response_format json_object), so the
 * word "JSON" must appear in the prompt and the model will only emit a
 * JSON object. Output is enforced downstream by the WordOrderContent /
 * WordOrderSolution Zod schemas plus the permutation check in
 * shared/validate.ts.
 */
import type { PromptParts } from "../../prompt-types.js";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce WORD_ORDER exercises. You must respond with a single valid JSON object — no commentary.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for WORD_ORDER:
- correctOrder must form a grammatically correct German sentence respecting German word order (verb-second in main clauses, verb-final in subordinate clauses). scrambled is the same tokens shuffled into a clearly different order.
- Each token is exactly one word or one trailing punctuation mark — never merge a word with its punctuation.
- Do not add, drop, or alter any token between scrambled and correctOrder — they must contain identical tokens.
- The scrambled order must differ from the correct order.

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1024,
  instructions: ({ level, topic }) => `Produce ONE WORD_ORDER exercise as a JSON object.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Required JSON shape:
{
  "title": "<short German title, e.g. 'Satzstellung: ${topic}'>",
  "content": {
    "scrambled": ["<token 1>", "<token 2>", ...]   // same tokens as correctOrder, shuffled into a DIFFERENT order
  },
  "solution": {
    "correctOrder": ["<token 1>", "<token 2>", ...]   // tokens in the correct German sequence
  },
  "explanation": { "en": "...", "pt": "...", "tr": "...", "uk": "..." },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": { "en": "...", "pt": "...", "tr": "...", "uk": "..." }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest present tense, basic vocabulary (4–8 tokens). A2: Perfekt and modal verbs allowed. B1: subordinate clauses, dative/accusative, wider vocabulary. B2: complex syntax, Konjunktiv, nuanced connectors.
- scrambled and correctOrder must be exact permutations of each other — identical multiset of tokens, different order.
- Vary structure and vocabulary from the recent examples above.
- The tip must NOT reveal the correct order — hint at the rule only.
- Title under 60 chars; each tip locale under ~120 chars.`,
};
