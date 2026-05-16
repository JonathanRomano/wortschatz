"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ExerciseType } from "@wortschatz/database";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";

import { ExerciseRenderer } from "@/components/exercises/renderers";
import { ExerciseResult } from "@/components/exercises/ExerciseResult";
import {
  submitExerciseAttempt,
  type SubmitResult,
} from "@/lib/exercises/actions";
import { useRouter } from "@/i18n/navigation";

type Props = {
  exerciseId: string;
  type: ExerciseType;
  content: Record<string, unknown>;
  explanation: string;
  alreadyEarned?: boolean;
};

export function ExerciseRunner({
  exerciseId,
  type,
  content,
  explanation,
  alreadyEarned,
}: Props) {
  const t = useTranslations("exercises");
  const [answer, setAnswer] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submitted = result?.ok === true;

  return (
    <Stack spacing={3}>
      {alreadyEarned ? (
        <Alert
          severity="info"
          icon={false}
          sx={{
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

      <ExerciseRenderer
        type={type}
        content={content}
        value={answer}
        onChange={setAnswer}
        disabled={submitted}
      />

      {!submitted ? (
        <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" } }}>
          <Button
            type="button"
            variant="contained"
            color="primary"
            size="large"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await submitExerciseAttempt(exerciseId, answer);
                setResult(r);
              })
            }
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 160 } }}
          >
            {pending ? t("loading") : t("submit")}
          </Button>
        </Box>
      ) : null}

      {result && !result.ok ? (
        <Alert severity="error" role="alert">
          {result.error}
        </Alert>
      ) : null}

      {result?.ok ? (
        <Fade in timeout={300}>
          <Stack spacing={2}>
            <ExerciseResult
              score={result.score}
              feedback={result.feedback}
              explanation={explanation}
              reward={result.reward}
              streakBonus={result.streakBonus}
              alreadyEarned={result.alreadyEarned}
            />
            <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" } }}>
              <Button
                type="button"
                variant="contained"
                color="primary"
                size="large"
                onClick={() => router.push(`/exercises/${type}`)}
                sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 160 } }}
              >
                {t("next")}
              </Button>
            </Box>
          </Stack>
        </Fade>
      ) : null}
    </Stack>
  );
}
