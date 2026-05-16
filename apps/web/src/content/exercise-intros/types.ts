import type { ExerciseType } from "@prisma/client";
import type { LocalizedText } from "@/lib/exercises/i18n";

/**
 * Static, hand-translated copy shown on the per-exercise-type intro
 * screen. One object per `ExerciseType`. Strings are read with
 * `pickLocalized(value, locale)` so missing locales fall back to English.
 */
export type ExerciseIntro = {
  type: ExerciseType;
  whatItAsks: LocalizedText;
  howToInteract: LocalizedText;
  example: {
    prompt: LocalizedText;
    solvedExplanation: LocalizedText;
  };
};
