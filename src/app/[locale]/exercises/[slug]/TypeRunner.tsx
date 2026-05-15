"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CefrLevel, ExerciseType } from "@prisma/client";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

import { ExerciseRenderer } from "@/components/exercises/renderers";
import { ExerciseResult } from "@/components/exercises/ExerciseResult";
import {
  submitExerciseAttempt,
  type SubmitResult,
} from "@/lib/exercises/actions";
import type { Locale } from "@/i18n/config";
import { Card } from "@/components/ui/Card";
import { LevelChip } from "@/components/ui/LevelChip";
import { fetchNextExerciseOfType } from "./actions";

export type LoadedExercise = {
  id: string;
  type: ExerciseType;
  level: CefrLevel;
  title: string;
  instructions: string;
  explanation: string;
  content: Record<string, unknown>;
  alreadyEarned: boolean;
};

type Props = {
  type: ExerciseType;
  // Optional level filter coming from the page's search params.
  level?: CefrLevel;
  initialExercise: LoadedExercise;
};

export function TypeRunner({ type, level, initialExercise }: Props) {
  const t = useTranslations("exercises");
  const locale = useLocale() as Locale;

  const [exercise, setExercise] = useState<LoadedExercise>(initialExercise);
  const [answer, setAnswer] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [loadingNext, startNext] = useTransition();

  const submitted = result?.ok === true;

  const onSubmit = () => {
    startSubmit(async () => {
      const r = await submitExerciseAttempt(exercise.id, answer);
      setResult(r);
    });
  };

  const onNext = () => {
    startNext(async () => {
      const next = await fetchNextExerciseOfType(type, locale, exercise.id, level);
      if (next) {
        setExercise(next);
        setAnswer({});
        setResult(null);
      }
    });
  };

  return (
    <Card padding="lg" sx={{ mt: 4 }}>
      <Box component="header">
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <LevelChip level={exercise.level} />
        </Stack>
        <Typography
          variant="h2"
          sx={{ mt: 1.5, fontSize: { xs: "1.5rem", sm: "1.875rem" } }}
        >
          {exercise.title}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
          {exercise.instructions}
        </Typography>
      </Box>

      {exercise.alreadyEarned ? (
        <Alert
          severity="info"
          icon={false}
          sx={{
            mt: 2.5,
            backgroundColor: "surfaceAlt.main",
            color: "text.secondary",
            border: 1,
            borderColor: "divider",
            borderStyle: "solid",
          }}
        >
          {t("alreadyEarned")}
        </Alert>
      ) : null}

      <Box sx={{ mt: 3 }}>
        <ExerciseRenderer
          type={type}
          content={exercise.content}
          value={answer}
          onChange={setAnswer}
          disabled={submitted}
        />
      </Box>

      {!submitted ? (
        <Button
          type="button"
          variant="contained"
          color="primary"
          disabled={submitting}
          onClick={onSubmit}
          sx={{ mt: 3, width: { xs: "100%", sm: "auto" } }}
        >
          {submitting ? t("loading") : t("submit")}
        </Button>
      ) : null}

      {result && !result.ok ? (
        <Alert severity="error" role="alert" sx={{ mt: 3 }}>
          {result.error}
        </Alert>
      ) : null}

      {result?.ok ? (
        <Stack spacing={2} sx={{ mt: 3 }}>
          <ExerciseResult
            score={result.score}
            feedback={result.feedback}
            explanation={exercise.explanation}
            reward={result.reward}
            streakBonus={result.streakBonus}
            alreadyEarned={result.alreadyEarned}
          />
          <Button
            type="button"
            variant="contained"
            color="primary"
            disabled={loadingNext}
            onClick={onNext}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {loadingNext ? t("loading") : t("next")}
          </Button>
        </Stack>
      ) : null}
    </Card>
  );
}
