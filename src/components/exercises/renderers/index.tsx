"use client";

import type { ExerciseType } from "@prisma/client";
import type { RendererProps } from "../types";

import { FillInTheBlankRenderer } from "./FillInTheBlank";
import { MultipleChoiceRenderer } from "./MultipleChoice";
import { TranslationRenderer } from "./Translation";
import { WordOrderRenderer } from "./WordOrder";
import { MatchingRenderer } from "./Matching";
import { ListeningComprehensionRenderer } from "./ListeningComprehension";
import { ReadingComprehensionRenderer } from "./ReadingComprehension";
import { VerbConjugationRenderer } from "./VerbConjugation";
import { ErrorCorrectionRenderer } from "./ErrorCorrection";
import { FreeWritingRenderer } from "./FreeWriting";

const registry: Record<ExerciseType, (p: RendererProps) => React.ReactNode> = {
  FILL_IN_THE_BLANK: FillInTheBlankRenderer,
  MULTIPLE_CHOICE: MultipleChoiceRenderer,
  TRANSLATION: TranslationRenderer,
  WORD_ORDER: WordOrderRenderer,
  MATCHING: MatchingRenderer,
  LISTENING_COMPREHENSION: ListeningComprehensionRenderer,
  READING_COMPREHENSION: ReadingComprehensionRenderer,
  VERB_CONJUGATION: VerbConjugationRenderer,
  ERROR_CORRECTION: ErrorCorrectionRenderer,
  FREE_WRITING: FreeWritingRenderer,
};

export function ExerciseRenderer(props: RendererProps) {
  const Component = registry[props.type];
  if (!Component) {
    return (
      <p className="text-sm text-muted-foreground">
        Renderer for {props.type} is not implemented yet.
      </p>
    );
  }
  return <Component {...props} />;
}
