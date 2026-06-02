/**
 * GPT prompt — LISTENING_COMPREHENSION.
 *
 * Runs under OpenAI JSON mode (the client sets response_format json_object),
 * so the word "JSON" must appear in the prompt and the model will only emit
 * a JSON object. Output is enforced downstream by the
 * ListeningComprehensionContent / ListeningComprehensionSolution Zod schemas.
 *
 * Exports a single `promptParts: PromptParts` split into four pieces
 * (system / instructions / jsonShape / rules); the shared builder injects
 * the recent-examples block between instructions and jsonShape.
 *
 * Note: the schema supports an optional audioUrl field but audio hosting is
 * not yet wired up — the transcript stands in for audio.
 */
import type { PromptParts } from "../../shared/types";

const SYSTEM = `You are a German-language exercise author for Wortschatz, a CEFR-aligned vocabulary trainer.
You ONLY produce LISTENING_COMPREHENSION exercises. You must respond with a single valid JSON object — no commentary.
The German content must be correct, idiomatic, and appropriate for the requested CEFR level.

Quality bar for LISTENING_COMPREHENSION:
- The transcript must read like natural spoken German for the level — contractions, discourse markers, and conversational phrasing where appropriate.
- The question must be answerable from the transcript alone.
- Do not include an audioUrl field — only transcript and question.

Localized fields (explanation, tip) must be a JSON object with keys en, pt (Brazilian Portuguese), tr (Turkish), uk (Ukrainian), each a non-empty string.`;

export const promptParts: PromptParts = {
  system: SYSTEM,
  maxTokens: 1536,
  instructions: ({ level, topic }) => `Produce ONE LISTENING_COMPREHENSION exercise as a JSON object.

CEFR level: ${level}
Topic: ${topic}
Target language: German`,
  jsonShape: ({ topic }) => `Required JSON shape:
{
  "title": "<short German title, e.g. 'Hörverständnis: ${topic}'>",
  "content": {
    "transcript": "<natural spoken German appropriate for the level — A1: 2–3 sentence monologue or exchange; A2: slightly longer dialogue or announcement; B1: realistic short conversation with varied sentence types; B2: nuanced dialogue or monologue with complex phrasing>",
    "question": "<a German question answerable from the transcript alone>"
  },
  "solution": {
    "expectedAnswer": "<a concise German answer supported by the transcript>"
  },
  "explanation": { "en": "...", "pt": "...", "tr": "...", "uk": "..." },
  "tags": ["<1-5 short lowercase tags>"],
  "tip": { "en": "...", "pt": "...", "tr": "...", "uk": "..." }
}`,
  rules: ({ level }) => `Rules:
- Use only vocabulary and grammar a ${level} learner is expected to know.
- A1: simplest present tense, basic vocab, very short exchanges. A2: Perfekt and modal verbs allowed. B1: subordinate clauses, dative/accusative, wider vocabulary. B2: complex syntax, Konjunktiv, nuanced connectors, richer passages.
- The transcript must sound like natural speech — avoid overly textbook-style sentences.
- Do NOT include an audioUrl field anywhere in the JSON.
- The tip must NOT reveal the answer — nudge the learner toward where to listen carefully.
- Vary structure, vocabulary, and topic angle from the recent examples above.
- Title under 60 chars; each tip locale under ~120 chars.`,
};
