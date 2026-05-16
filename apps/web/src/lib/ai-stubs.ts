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

// Per-type instruction translations. Keys: en, pt, tr, uk.
const INSTRUCTIONS: Record<ExerciseType, LocalizedText> = {
  FILL_IN_THE_BLANK: {
    en: "Fill in the missing word.",
    pt: "Complete a palavra que falta.",
    tr: "Eksik kelimeyi doldurun.",
    uk: "Заповніть пропущене слово.",
  },
  MULTIPLE_CHOICE: {
    en: "Choose the correct answer.",
    pt: "Escolha a resposta correta.",
    tr: "Doğru cevabı seçin.",
    uk: "Виберіть правильну відповідь.",
  },
  TRANSLATION: {
    en: "Translate into German.",
    pt: "Traduza para o alemão.",
    tr: "Almancaya çevirin.",
    uk: "Перекладіть німецькою.",
  },
  WORD_ORDER: {
    en: "Put the words in the correct order.",
    pt: "Coloque as palavras na ordem correta.",
    tr: "Kelimeleri doğru sıraya koyun.",
    uk: "Розставте слова у правильному порядку.",
  },
  MATCHING: {
    en: "Match the German words to their translations.",
    pt: "Combine as palavras alemãs com suas traduções.",
    tr: "Almanca kelimeleri çevirileriyle eşleştirin.",
    uk: "Зіставте німецькі слова з їх перекладом.",
  },
  LISTENING_COMPREHENSION: {
    en: "Listen and answer the question.",
    pt: "Ouça e responda à pergunta.",
    tr: "Dinleyin ve soruyu cevaplayın.",
    uk: "Прослухайте та дайте відповідь на запитання.",
  },
  READING_COMPREHENSION: {
    en: "Read the text and answer the question.",
    pt: "Leia o texto e responda à pergunta.",
    tr: "Metni okuyun ve soruyu cevaplayın.",
    uk: "Прочитайте текст і дайте відповідь на запитання.",
  },
  VERB_CONJUGATION: {
    en: "Conjugate the verb.",
    pt: "Conjugue o verbo.",
    tr: "Fiili çekin.",
    uk: "Провідміняйте дієслово.",
  },
  ERROR_CORRECTION: {
    en: "Find and correct the error.",
    pt: "Encontre e corrija o erro.",
    tr: "Hatayı bulun ve düzeltin.",
    uk: "Знайдіть і виправте помилку.",
  },
  FREE_WRITING: {
    en: "Write a short text on the topic.",
    pt: "Escreva um texto curto sobre o tema.",
    tr: "Konu hakkında kısa bir metin yazın.",
    uk: "Напишіть короткий текст на тему.",
  },
};

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

export function stubExercise(
  type: ExerciseType,
  level: CefrLevel,
  topic: string,
): GeneratedExercise {
  // Deliberately deterministic so seeders are reproducible without AI.
  const base = {
    type,
    level,
    instructions: INSTRUCTIONS[type],
    explanation: stubExplanation(type, level, topic),
    tags: [topic, level.toLowerCase(), "stub"],
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
