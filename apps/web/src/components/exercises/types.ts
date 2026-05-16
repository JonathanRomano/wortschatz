import type { ExerciseType } from "@wortschatz/database";

export type RendererProps = {
  type: ExerciseType;
  content: Record<string, unknown>;
  // Called whenever the user's answer changes. Parent decides when to submit.
  onChange: (answer: Record<string, unknown>) => void;
  // The current draft answer (lifted up so renderers stay controlled).
  value: Record<string, unknown>;
  disabled?: boolean;
};
