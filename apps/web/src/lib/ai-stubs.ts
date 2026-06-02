/**
 * Deterministic offline stubs used when ANTHROPIC_API_KEY is missing.
 *
 * Kept in their own module so `src/lib/ai.ts` reads as the real Claude
 * integration first, with the stub branch a single early `return`. No DB
 * writes happen in any of these paths — the cache + usage tables stay
 * empty until the key is set.
 */

import type { CefrLevel, ExerciseType } from "@wortschatz/database";

import type { LocalizedText } from "@wortschatz/types";
import type { GeneratedExercise } from "@/lib/ai";

// Per-type prompt instructions are no longer part of GeneratedExercise —
// they live in `messages/*.json` (`exercises.instructionsByType`) and are
// resolved by the runner. The stub doesn't need to emit them.

function stubExplanation(
  type: ExerciseType,
  level: CefrLevel,
  topic: string,
): LocalizedText {
  const label = type.toLowerCase().replace(/_/g, " ");
  return {
    en: `(Stub explanation) Placeholder ${label} exercise for level ${level} on "${topic}".`,
    pt: `(Explicação de exemplo) Exercício ${label} para o nível ${level} sobre "${topic}".`,
    tr: `(Örnek açıklama) "${topic}" konusunda ${level} seviyesi için ${label} alıştırması.`,
    uk: `(Приклад пояснення) Вправа ${label} рівня ${level} на тему "${topic}".`,
  };
}

function stubTip(type: ExerciseType): LocalizedText {
  const label = type.toLowerCase().replace(/_/g, " ");
  return {
    en: `(Stub tip) Hint for the ${label} exercise.`,
    pt: `(Dica de exemplo) Sugestão para o exercício de ${label}.`,
    tr: `(Örnek ipucu) ${label} alıştırması için bir ipucu.`,
    uk: `(Приклад підказки) Підказка до вправи ${label}.`,
  };
}

export function stubExercise(
  type: ExerciseType,
  level: CefrLevel,
  topic: string,
): GeneratedExercise {
  // Deliberately deterministic so seeders are reproducible without AI.
  const base = {
    type,
    level,
    explanation: stubExplanation(type, level, topic),
    tags: [topic, level.toLowerCase(), "stub"],
    tip: stubTip(type),
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

// stubEvaluation + stubReview moved to apps/api/src/services/stubs.ts
// as part of Sprint 03 Task 7. The api owns the stub fallback for the
// review and evaluate endpoints now that the web delegates to it.
