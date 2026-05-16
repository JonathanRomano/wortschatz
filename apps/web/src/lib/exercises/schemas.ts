import { z } from "zod";

/**
 * Per-exercise-type content & answer schemas.
 *
 * Adding a new exercise type:
 *   1. Add the enum value in prisma/schema.prisma (`ExerciseType`).
 *   2. Add a `<NAME>Content` and `<NAME>Answer` schema below.
 *   3. Wire it into `contentSchemaFor` / `answerSchemaFor` and the
 *      renderer registry in src/components/exercises/renderers/index.tsx.
 *   4. Implement evaluation in src/lib/exercises/grade.ts.
 */

// 1. Fill in the blank --------------------------------------------------
export const FillInTheBlankContent = z.object({
  // The German sentence with `___` marking each blank, e.g.
  // "Ich ___ einen Apfel."
  sentence: z.string(),
  blanksCount: z.number().int().positive(),
  hint: z.string().optional(),
});
export const FillInTheBlankAnswer = z.object({
  // One answer string per blank, in left-to-right order.
  blanks: z.array(z.string()),
});
export const FillInTheBlankSolution = FillInTheBlankAnswer;

// 2. Multiple choice ----------------------------------------------------
export const MultipleChoiceContent = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
});
export const MultipleChoiceAnswer = z.object({
  selectedIndex: z.number().int().min(0).max(3),
});
export const MultipleChoiceSolution = z.object({
  correctIndex: z.number().int().min(0).max(3),
});

// 3. Translation --------------------------------------------------------
export const TranslationContent = z.object({
  sourceText: z.string(),
  // ISO 639-1 of the source. Default to English in seeders.
  sourceLanguage: z.enum(["en", "pt"]).default("en"),
});
export const TranslationAnswer = z.object({
  translation: z.string(),
});
export const TranslationSolution = z.object({
  // Multiple acceptable answers; grading is fuzzy.
  acceptedTranslations: z.array(z.string()).min(1),
});

// 4. Word order ---------------------------------------------------------
export const WordOrderContent = z.object({
  // Scrambled tokens shown to the user.
  scrambled: z.array(z.string()).min(2),
});
export const WordOrderAnswer = z.object({
  ordered: z.array(z.string()),
});
export const WordOrderSolution = z.object({
  correctOrder: z.array(z.string()),
});

// 5. Matching -----------------------------------------------------------
export const MatchingContent = z.object({
  // Words on the left (German). Translations on the right (UI language).
  german: z.array(z.string()).min(2),
  translations: z.array(z.string()).min(2),
});
export const MatchingAnswer = z.object({
  // Map of german word -> chosen translation.
  pairs: z.record(z.string(), z.string()),
});
export const MatchingSolution = z.object({
  pairs: z.record(z.string(), z.string()),
});

// 6. Listening (audio integration deferred) -----------------------------
export const ListeningComprehensionContent = z.object({
  // TODO(audio): replace with an audio asset URL once asset hosting is
  // wired up. For now we ship the transcript and pretend it's audio.
  transcript: z.string(),
  audioUrl: z.string().optional(),
  question: z.string(),
});
export const ListeningComprehensionAnswer = z.object({
  answer: z.string(),
});
export const ListeningComprehensionSolution = z.object({
  expectedAnswer: z.string(),
});

// 7. Reading comprehension ---------------------------------------------
export const ReadingComprehensionContent = z.object({
  passage: z.string(),
  question: z.string(),
});
export const ReadingComprehensionAnswer = z.object({
  answer: z.string(),
});
export const ReadingComprehensionSolution = z.object({
  expectedAnswer: z.string(),
});

// 8. Verb conjugation ---------------------------------------------------
export const VerbConjugationContent = z.object({
  infinitive: z.string(),
  pronoun: z.enum(["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"]),
  tense: z.enum(["Präsens", "Präteritum", "Perfekt", "Futur"]),
});
export const VerbConjugationAnswer = z.object({
  conjugated: z.string(),
});
export const VerbConjugationSolution = z.object({
  correctForm: z.string(),
});

// 9. Error correction ---------------------------------------------------
export const ErrorCorrectionContent = z.object({
  // Sentence containing exactly one grammatical error.
  sentence: z.string(),
});
export const ErrorCorrectionAnswer = z.object({
  corrected: z.string(),
});
export const ErrorCorrectionSolution = z.object({
  corrected: z.string(),
  errorDescription: z.string(),
});

// 10. Free writing ------------------------------------------------------
export const FreeWritingContent = z.object({
  prompt: z.string(),
  minWords: z.number().int().positive().default(40),
});
export const FreeWritingAnswer = z.object({
  text: z.string(),
});
// No deterministic solution — graded by AI.
export const FreeWritingSolution = z.object({
  rubric: z.string().optional(),
});

// --- Type registry ----------------------------------------------------

import type { ExerciseType } from "@wortschatz/database";

export const contentSchemaFor: Record<ExerciseType, z.ZodTypeAny> = {
  FILL_IN_THE_BLANK: FillInTheBlankContent,
  MULTIPLE_CHOICE: MultipleChoiceContent,
  TRANSLATION: TranslationContent,
  WORD_ORDER: WordOrderContent,
  MATCHING: MatchingContent,
  LISTENING_COMPREHENSION: ListeningComprehensionContent,
  READING_COMPREHENSION: ReadingComprehensionContent,
  VERB_CONJUGATION: VerbConjugationContent,
  ERROR_CORRECTION: ErrorCorrectionContent,
  FREE_WRITING: FreeWritingContent,
};

export const answerSchemaFor: Record<ExerciseType, z.ZodTypeAny> = {
  FILL_IN_THE_BLANK: FillInTheBlankAnswer,
  MULTIPLE_CHOICE: MultipleChoiceAnswer,
  TRANSLATION: TranslationAnswer,
  WORD_ORDER: WordOrderAnswer,
  MATCHING: MatchingAnswer,
  LISTENING_COMPREHENSION: ListeningComprehensionAnswer,
  READING_COMPREHENSION: ReadingComprehensionAnswer,
  VERB_CONJUGATION: VerbConjugationAnswer,
  ERROR_CORRECTION: ErrorCorrectionAnswer,
  FREE_WRITING: FreeWritingAnswer,
};

export const solutionSchemaFor: Record<ExerciseType, z.ZodTypeAny> = {
  FILL_IN_THE_BLANK: FillInTheBlankSolution,
  MULTIPLE_CHOICE: MultipleChoiceSolution,
  TRANSLATION: TranslationSolution,
  WORD_ORDER: WordOrderSolution,
  MATCHING: MatchingSolution,
  LISTENING_COMPREHENSION: ListeningComprehensionSolution,
  READING_COMPREHENSION: ReadingComprehensionSolution,
  VERB_CONJUGATION: VerbConjugationSolution,
  ERROR_CORRECTION: ErrorCorrectionSolution,
  FREE_WRITING: FreeWritingSolution,
};
