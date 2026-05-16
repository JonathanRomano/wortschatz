"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ExerciseType } from "@prisma/client";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

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
        <Button
          type="button"
          variant="contained"
          color="primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await submitExerciseAttempt(exerciseId, answer);
              setResult(r);
            })
          }
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          {pending ? t("loading") : t("submit")}
        </Button>
      ) : null}

      {result && !result.ok ? (
        <Alert severity="error" role="alert">
          {result.error}
        </Alert>
      ) : null}

      {result?.ok ? (
        <Stack spacing={2}>
          <ExerciseResult
            score={result.score}
            feedback={result.feedback}
            explanation={explanation}
            reward={result.reward}
            streakBonus={result.streakBonus}
            alreadyEarned={result.alreadyEarned}
          />
          <Button
            type="button"
            variant="outlined"
            onClick={() => router.push(`/exercises/${type}`)}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {t("next")}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
