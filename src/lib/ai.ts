import type { CefrLevel, Exercise, ExerciseType } from "@prisma/client";
import type { LocalizedText } from "@/lib/exercises/i18n";

/**
 * AI integration surface for Wortschatz.
 *
 * NOTE: AI calls are intentionally NOT executed in this scaffold. The
 * functions below return deterministic stubs and log a warning so the
 * app can run end-to-end without an ANTHROPIC_API_KEY. Once the key is
 * wired up, replace the marked TODO blocks with real Claude calls.
 *
 * Model: claude-sonnet-4-6 (override via ANTHROPIC_MODEL env var).
 */

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export const AI_CONFIGURED = Boolean(process.env.ANTHROPIC_API_KEY);

function warnDisabled(fn: string) {
  if (!AI_CONFIGURED) {
    console.warn(
      `[ai.ts] ${fn}: ANTHROPIC_API_KEY missing — returning stub. ` +
        `Set the env var to enable real Claude (${MODEL}) calls.`,
    );
  }
}

// --- Public API --------------------------------------------------------

export type GeneratedExercise = {
  type: ExerciseType;
  level: CefrLevel;
  title: string;
  instructions: LocalizedText;
  content: Record<string, unknown>;
  solution: Record<string, unknown>;
  explanation: LocalizedText;
  tags: string[];
};

/**
 * Generate a single exercise of the requested type & level.
 *
 * TODO(ai): call Claude with a system prompt that:
 *   - declares the schema for the requested ExerciseType (see
 *     src/lib/exercises/schemas.ts)
 *   - asks for `content`, `solution`, `explanation`, `tags` in JSON
 *   - validates the response with the Zod schema before returning
 */
export async function generateExercise(
  type: ExerciseType,
  level: CefrLevel,
  topic: string,
): Promise<GeneratedExercise> {
  warnDisabled("generateExercise");
  return stubExercise(type, level, topic);
}

export type AIEvaluation = {
  score: number; // 0-100
  feedback: string;
};

/**
 * Evaluate a user's answer with AI. Used as a fallback for open-ended
 * exercise types and as a richer second pass for closed types.
 *
 * TODO(ai): call Claude with the exercise (sans solution leakage when
 * not needed), the user answer, and ask for `{ score, feedback }`.
 */
export async function evaluateAnswer(
  exercise: Pick<Exercise, "type" | "content" | "solution" | "explanation">,
  userAnswer: unknown,
): Promise<AIEvaluation> {
  warnDisabled("evaluateAnswer");
  // Without AI we return a neutral placeholder; rule-based grading in
  // src/lib/exercises/grade.ts handles closed types deterministically.
  return {
    score: 50,
    feedback:
      "AI evaluation is disabled (no ANTHROPIC_API_KEY). " +
      "The deterministic grader handled what it could; open-ended feedback is unavailable.",
  };
}

export type ReviewResult = {
  feedback: string;
};

/**
 * Detailed grammar/style review of a user-submitted text.
 *
 * TODO(ai): call Claude with a teacher persona, the user level, and the
 * raw text. Return Markdown feedback with sections for grammar,
 * vocabulary, style, and a corrected version.
 */
export async function reviewText(
  text: string,
  userLevel: CefrLevel,
): Promise<ReviewResult> {
  warnDisabled("reviewText");
  return {
    feedback:
      `# Stub review\n\nReview for level **${userLevel}** is currently disabled.\n\n` +
      `Configure \`ANTHROPIC_API_KEY\` to enable real Claude (${MODEL}) feedback. ` +
      `Your text (${text.split(/\s+/).filter(Boolean).length} words) was received and stored.`,
  };
}

// --- Stub generator ---------------------------------------------------

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

function stubExplanation(type: ExerciseType, level: CefrLevel, topic: string): LocalizedText {
  const label = type.toLowerCase().replace(/_/g, " ");
  return {
    en: `(Stub explanation) Placeholder ${label} exercise for level ${level} on "${topic}".`,
    pt: `(Explicação de exemplo) Exercício ${label} para o nível ${level} sobre "${topic}".`,
    tr: `(Örnek açıklama) "${topic}" konusunda ${level} seviyesi için ${label} alıştırması.`,
    uk: `(Приклад пояснення) Вправа ${label} рівня ${level} на тему "${topic}".`,
  };
}

function stubExercise(type: ExerciseType, level: CefrLevel, topic: string): GeneratedExercise {
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
