/**
 * Deterministic fallback responses used when ANTHROPIC_API_KEY is unset.
 * Returning these from the route handlers (instead of erroring) keeps
 * the dev experience smooth — the UI shows a clearly-stubbed answer and
 * no DB writes happen (cache + usage + rate-limit stay empty).
 *
 * Only stubs for the endpoints fully implemented by apps/api today;
 * generateExercise's stub stays in apps/web until the schemas are
 * extracted in a follow-up sprint.
 */
import type { AIEvaluation, ReviewResult } from "@wortschatz/types";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import type { GeneratedExerciseDTO } from "@wortschatz/exercises";

export function stubEvaluation(): AIEvaluation {
  return {
    score: 50,
    feedback:
      "AI evaluation is disabled (no ANTHROPIC_API_KEY). " +
      "The deterministic grader handled what it could; open-ended feedback is unavailable.",
  };
}

export function stubReview(
  text: string,
  userLevel: CefrLevel,
  model: string,
): ReviewResult {
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    feedback:
      `# Stub review\n\nReview for level **${userLevel}** is currently disabled.\n\n` +
      `Configure \`ANTHROPIC_API_KEY\` to enable real Claude (${model}) feedback. ` +
      `Your text (${words} words) was received and stored.`,
  };
}

/**
 * Deterministic generated exercise used when the chosen provider's API key
 * is missing. Content/solution per type are valid against the canonical Zod
 * schemas so the endpoint can return `ok: true` offline (mirrors the old
 * apps/web/src/lib/ai-stubs.ts stub, which is removed now that the web
 * delegates generation to apps/api).
 */
function stubLocalized(
  kind: string,
  type: ExerciseType,
  level: CefrLevel,
  topic: string,
): Record<string, string> {
  const label = type.toLowerCase().replace(/_/g, " ");
  return {
    en: `(Stub ${kind}) Placeholder ${label} for level ${level} on "${topic}".`,
    pt: `(${kind} de exemplo) Exercício ${label} para o nível ${level} sobre "${topic}".`,
    tr: `(Örnek ${kind}) "${topic}" konusunda ${level} seviyesi için ${label}.`,
    uk: `(Приклад: ${kind}) Вправа ${label} рівня ${level} на тему "${topic}".`,
  };
}

export function stubGenerate(
  type: ExerciseType,
  level: CefrLevel,
  topic: string,
): GeneratedExerciseDTO {
  const base = {
    explanation: stubLocalized("explanation", type, level, topic),
    tags: [topic, level.toLowerCase(), "stub"],
    tip: stubLocalized("tip", type, level, topic),
    modelUsed: "stub",
  };

  switch (type) {
    case "FILL_IN_THE_BLANK":
      return {
        ...base,
        title: `Lückentext: ${topic}`,
        content: { sentence: "Ich ___ einen Apfel.", blanksCount: 1, hint: "Verb 'essen'" },
        solution: { blanks: ["esse"] },
      };
    case "MULTIPLE_CHOICE":
      return {
        ...base,
        title: `Quiz: ${topic}`,
        content: {
          question: "Wie sagt man 'apple' auf Deutsch?",
          options: ["der Apfel", "die Birne", "die Banane", "die Traube"],
        },
        solution: { correctIndex: 0 },
      };
    case "TRANSLATION":
      return {
        ...base,
        title: `Übersetzung: ${topic}`,
        content: { sourceText: "I eat an apple.", sourceLanguage: "en" },
        solution: { acceptedTranslations: ["Ich esse einen Apfel.", "Ich esse einen Apfel"] },
      };
    case "WORD_ORDER":
      return {
        ...base,
        title: `Satzbau: ${topic}`,
        content: { scrambled: ["Apfel", "esse", "Ich", "einen"] },
        solution: { correctOrder: ["Ich", "esse", "einen", "Apfel"] },
      };
    case "MATCHING":
      return {
        ...base,
        title: `Wortschatz: ${topic}`,
        content: {
          german: ["Apfel", "Birne", "Banane"],
          translations: ["apple", "pear", "banana"],
        },
        solution: { pairs: { Apfel: "apple", Birne: "pear", Banane: "banana" } },
      };
    case "LISTENING_COMPREHENSION":
      return {
        ...base,
        title: `Hörverstehen: ${topic}`,
        content: {
          transcript: "Ich gehe heute in den Supermarkt und kaufe Äpfel.",
          question: "Wohin geht die Person?",
        },
        solution: { expectedAnswer: "in den Supermarkt" },
      };
    case "READING_COMPREHENSION":
      return {
        ...base,
        title: `Leseverstehen: ${topic}`,
        content: {
          passage: "Anna wohnt in Berlin. Sie arbeitet als Lehrerin in einer Grundschule.",
          question: "Was ist Annas Beruf?",
        },
        solution: { expectedAnswer: "Lehrerin" },
      };
    case "VERB_CONJUGATION":
      return {
        ...base,
        title: `Konjugation: ${topic}`,
        content: { infinitive: "essen", pronoun: "ich", tense: "Präsens" },
        solution: { correctForm: "esse" },
      };
    case "ERROR_CORRECTION":
      return {
        ...base,
        title: `Fehlerkorrektur: ${topic}`,
        content: { sentence: "Ich esse ein Apfel." },
        solution: {
          corrected: "Ich esse einen Apfel.",
          errorDescription: "Akkusativ maskulin: 'einen' statt 'ein'.",
        },
      };
    case "FREE_WRITING":
      return {
        ...base,
        title: `Schreibaufgabe: ${topic}`,
        content: { prompt: `Schreibe ein paar Sätze über ${topic}.`, minWords: 30 },
        solution: { rubric: "AI-graded; see explanation." },
      };
  }
}
