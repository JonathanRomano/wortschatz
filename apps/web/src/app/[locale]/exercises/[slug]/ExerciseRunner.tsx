"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ExerciseType } from "@wortschatz/database";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Fade from "@mui/material/Fade";
import Typography from "@mui/material/Typography";

import { ExerciseRenderer } from "@/components/exercises/renderers";
import { ExerciseResult } from "@/components/exercises/ExerciseResult";
import { TipPanel } from "@/components/exercises/TipPanel";
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
  // AI model that generated this exercise — surfaced only in the
  // dev id chip, never to end users.
  model?: string | null;
  // Localized tip text, or null when this exercise has no tip.
  tip?: string | null;
};

export function ExerciseRunner({
  exerciseId,
  type,
  content,
  explanation,
  alreadyEarned,
  model,
  tip,
}: Props) {
  const t = useTranslations("exercises");
  const [answer, setAnswer] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, startTransition] = useTransition();
  // Once revealed, tipUsed stays true — hiding the tip again must not
  // undo the reward penalty.
  const [tipUsed, setTipUsed] = useState(false);
  const router = useRouter();

  const submitted = result?.ok === true;

  return (
    <Stack spacing={3}>
      {process.env.NODE_ENV === "development" ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignSelf: "flex-start", flexWrap: "wrap" }}
        >
          <Typography
            component="code"
            variant="caption"
            title={t("debug.copyIdHint")}
            onClick={() => {
              void navigator.clipboard?.writeText(exerciseId);
            }}
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontFamily:
                'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
              backgroundColor: "surfaceAlt.main",
              color: "text.secondary",
              cursor: "copy",
              userSelect: "all",
            }}
          >
            id: {exerciseId}
          </Typography>
          <Typography
            component="code"
            variant="caption"
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontFamily:
                'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
              backgroundColor: "surfaceAlt.main",
              color: "text.secondary",
              userSelect: "all",
            }}
          >
            model: {model ?? "—"}
          </Typography>
        </Stack>
      ) : null}

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

      {tip ? (
        <TipPanel
          tip={tip}
          revealed={tipUsed}
          onReveal={() => setTipUsed(true)}
          disabled={submitted}
        />
      ) : null}

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
                const r = await submitExerciseAttempt(exerciseId, answer, tipUsed);
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
              correctAnswer={result.correctAnswer}
              newStreak={result.newStreak}
              streakMilestone={result.streakMilestone}
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
