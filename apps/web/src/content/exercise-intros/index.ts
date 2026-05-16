import type { ExerciseType } from "@prisma/client";

import { errorCorrection } from "./error-correction";
import { fillInTheBlank } from "./fill-in-the-blank";
import { freeWriting } from "./free-writing";
import { listeningComprehension } from "./listening-comprehension";
import { matching } from "./matching";
import { multipleChoice } from "./multiple-choice";
import { readingComprehension } from "./reading-comprehension";
import { translation } from "./translation";
import { verbConjugation } from "./verb-conjugation";
import { wordOrder } from "./word-order";
import type { ExerciseIntro } from "./types";

export type { ExerciseIntro } from "./types";

export const EXERCISE_INTROS: Record<ExerciseType, ExerciseIntro> = {
  FILL_IN_THE_BLANK: fillInTheBlank,
  MULTIPLE_CHOICE: multipleChoice,
  TRANSLATION: translation,
  WORD_ORDER: wordOrder,
  MATCHING: matching,
  LISTENING_COMPREHENSION: listeningComprehension,
  READING_COMPREHENSION: readingComprehension,
  VERB_CONJUGATION: verbConjugation,
  ERROR_CORRECTION: errorCorrection,
  FREE_WRITING: freeWriting,
};
