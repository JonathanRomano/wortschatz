/**
 * GPT prompt — MATCHING.
 *
 * Runs under OpenAI JSON mode (the client sets response_format json_object),
 * so the word "JSON" must appear in the prompt. Output is enforced downstream
 * by the MatchingContent / MatchingSolution Zod schemas in
 * src/lib/exercises/schemas.ts.
 *
 * Exports a single `promptParts: PromptParts` split into four pieces
 * (system / instructions / jsonShape / rules); the shared builder composes
 * them and injects the recent-examples block.
 */
import type { PromptParts } from "../../shared/types";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce MATCHING exercises. You must respond with a single valid JSON object — no commentary.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for MATCHING:
- Pairs must be unambiguous and one-to-one — no two German words share a translation.
- Use 3–6 pairs, thematically tied to the topic.
- The translations array contains English equivalents (the learner's interface language for seeds).

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 768,
  instructions: ({ level, topic }) => `Produce ONE MATCHING exercise as a JSON object.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Required JSON shape:
{
  "title": "<short German title, e.g. 'Zuordnung: ${topic}'>",
  "content": {
    "german": ["<word 1>", "<word 2>", ...],           // 3–6 German words, same length as translations
    "translations": ["<English 1>", "<English 2>", ...]  // English translation for each word, same order
  },
  "solution": {
    "pairs": {
      "<german word 1>": "<its English translation>",
      "<german word 2>": "<its English translation>",
      ...
    }
  },
  "explanation": { "en": "...", "pt": "...", "tr": "...", "uk": "..." },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": { "en": "...", "pt": "...", "tr": "...", "uk": "..." }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest, basic vocabulary. A2: Perfekt and modal verbs in context, common collocations. B1: subordinate clauses context, dative/accusative, wider vocabulary. B2: complex syntax, Konjunktiv, nuanced connectors.
- german.length must equal translations.length (3–6 items each).
- Every entry in german must appear as a key in solution.pairs mapped to its exact English translation from the translations array.
- The values in solution.pairs must be exactly the entries from the translations array — no paraphrasing.
- No two German words may map to the same English translation.
- The tip must NOT reveal any pair — hint at a strategy, not the answers.
- Title under 60 chars; each tip locale under ~120 chars.
- Vary structure and vocabulary from the recent examples above.`,
};
