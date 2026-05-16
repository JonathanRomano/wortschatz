import type { CefrLevel, ExerciseType } from "@wortschatz/database";

import type { LocalizedText } from "./locale.js";

export type { CefrLevel, ExerciseType };

/**
 * Shape returned by the AI exercise generator (and the stub fallback).
 * `content` and `solution` are deliberately loose because each exercise
 * type has its own internal schema — strict validation lives next to the
 * type-specific renderers, not in this shared types package.
 */
export interface GeneratedExercise {
  type: ExerciseType;
  level: CefrLevel;
  title: string;
  instructions: LocalizedText;
  content: Record<string, unknown>;
  solution: Record<string, unknown>;
  explanation: LocalizedText;
  tags: string[];
}
