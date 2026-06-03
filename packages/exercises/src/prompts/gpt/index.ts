/**
 * GPT prompt registry — maps every ExerciseType to its PromptParts.
 * Adding a new type: add the enum value, drop a file beside this one that
 * exports `promptParts: PromptParts`, and wire it in below (the
 * PromptRegistry type makes a missing key a compile error). The shared
 * prompt-builder composes the four pieces into the final message.
 */
import type { PromptRegistry } from "../../prompt-types.js";

import { promptParts as fillInTheBlank } from "./fill-in-the-blank.js";
import { promptParts as multipleChoice } from "./multiple-choice.js";
import { promptParts as translation } from "./translation.js";
import { promptParts as wordOrder } from "./word-order.js";
import { promptParts as matching } from "./matching.js";
import { promptParts as listeningComprehension } from "./listening-comprehension.js";
import { promptParts as readingComprehension } from "./reading-comprehension.js";
import { promptParts as verbConjugation } from "./verb-conjugation.js";
import { promptParts as errorCorrection } from "./error-correction.js";
import { promptParts as freeWriting } from "./free-writing.js";

export const gptPrompts: PromptRegistry = {
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
