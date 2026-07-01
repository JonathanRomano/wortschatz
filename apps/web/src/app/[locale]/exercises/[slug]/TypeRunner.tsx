"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";

import { ExerciseRenderer } from "@/components/exercises/renderers";
import { ExerciseResult } from "@/components/exercises/ExerciseResult";
import { IntroScreen } from "@/components/exercises/IntroScreen";
import { IntroModal } from "@/components/exercises/IntroModal";
import { TipPanel } from "@/components/exercises/TipPanel";
import {
  submitExerciseAttempt,
  type SubmitResult,
} from "@/lib/exercises/actions";
import type { Locale } from "@/i18n/config";
import { Card } from "@/components/ui/Card";
import { LevelChip } from "@/components/ui/LevelChip";
import {
  EMPTY_SESSION,
  isSessionComplete,
  PRACTICE_SESSIONS,
  recordSubmission,
  SESSION_LENGTH,
  sessionProgressPct,
} from "@/lib/exercises/session";
import { fetchNextExerciseOfType } from "./actions";

export type LoadedExercise = {
  id: string;
  type: ExerciseType;
  level: CefrLevel;
  title: string;
  explanation: string;
  content: Record<string, unknown>;
  alreadyEarned: boolean;
  // AI model that generated this exercise (NULL for stub / hand-authored).
  // Surfaced only in the dev id chip — not user-facing.
  model: string | null;
  // Localized tip (already picked for the current locale). NULL when the
  // exercise has no tip.
  tip: string | null;
};

type Props = {
  type: ExerciseType;
  // Optional level filter coming from the page's search params.
  level?: CefrLevel;
  initialExercise: LoadedExercise;
  // Whether the user has previously opted out of the intro for this
  // type. Drives the initial "show intro vs exercise" branch.
  initialSkipIntro: boolean;
};

export function TypeRunner({
  type,
  level,
  initialExercise,
  initialSkipIntro,
}: Props) {
  const t = useTranslations("exercises");
  const tInstr = useTranslations("exercises.instructionsByType");
  const tIntro = useTranslations("exerciseIntros");
  const locale = useLocale() as Locale;

  // Inline intro screen shown on first visit if the user hasn't opted
  // out. Once dismissed we flip to false for the rest of this session.
  const [showIntro, setShowIntro] = useState<boolean>(!initialSkipIntro);
  // Help modal — opened by the question-mark button or `?` shortcut.
  const [helpOpen, setHelpOpen] = useState<boolean>(false);

  const [exercise, setExercise] = useState<LoadedExercise>(initialExercise);
  const [answer, setAnswer] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [loadingNext, startNext] = useTransition();
  // Tip-used state is per-exercise; reset alongside answer when Next
  // swaps in a new exercise so the next prompt starts with the tip
  // hidden and the full reward available.
  const [tipUsed, setTipUsed] = useState(false);
  // Bounded-session tally (iter 11): counts submissions this session so we can
  // show progress and a completion screen instead of an endless "Next" loop.
  const [session, setSession] = useState(EMPTY_SESSION);

  const submitted = result?.ok === true;
  const sessionDone = PRACTICE_SESSIONS && isSessionComplete(session);

  // Global `?` (Shift+/) shortcut to re-open the intro. We skip if the
  // user is currently typing in an input/textarea/contenteditable to
  // avoid hijacking literal "?" characters they're entering.
  useEffect(() => {
    if (showIntro) return; // intro is already on screen
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      e.preventDefault();
      setHelpOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showIntro]);

  const onSubmit = () => {
    startSubmit(async () => {
      const r = await submitExerciseAttempt(exercise.id, answer, tipUsed);
      setResult(r);
      if (r.ok) setSession((s) => recordSubmission(s, r.score >= 60));
    });
  };

  const onNext = () => {
    startNext(async () => {
      const next = await fetchNextExerciseOfType(type, locale, exercise.id, level);
      if (next) {
        setExercise(next);
        setAnswer({});
        setResult(null);
        setTipUsed(false);
      }
    });
  };

  // Start a fresh session and load the next exercise.
  const onPracticeAgain = () => {
    setSession(EMPTY_SESSION);
    onNext();
  };

  if (showIntro) {
    return (
      <IntroScreen
        type={type}
        initialSkip={initialSkipIntro}
        onContinue={() => setShowIntro(false)}
      />
    );
  }

  return (
    <>
      <Card padding="lg" sx={{ mt: 4 }}>
        <Box component="header">
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap" }}
            >
              <LevelChip level={exercise.level} />
              {process.env.NODE_ENV === "development" ? (
                <>
                  <Typography
                    component="code"
                    variant="caption"
                    title={t("debug.copyIdHint")}
                    onClick={() => {
                      void navigator.clipboard?.writeText(exercise.id);
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
                    id: {exercise.id}
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
                    model: {exercise.model ?? "—"}
                  </Typography>
                </>
              ) : null}
            </Stack>
            <IconButton
              type="button"
              aria-label={tIntro("openHelp")}
              onClick={() => setHelpOpen(true)}
              sx={{ minHeight: 44, minWidth: 44 }}
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Typography
            variant="h2"
            sx={{ mt: 1.5, fontSize: { xs: "1.5rem", sm: "1.875rem" } }}
          >
            {exercise.title}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
            {tInstr(exercise.type)}
          </Typography>
          {PRACTICE_SESSIONS ? (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={sessionProgressPct(session)}
                aria-label={t("sessionProgress", {
                  done: Math.min(session.completed, SESSION_LENGTH),
                  total: SESSION_LENGTH,
                })}
                sx={{ height: 6, borderRadius: 999 }}
              />
              <Typography
                variant="caption"
                sx={{ mt: 0.5, display: "block", color: "text.secondary" }}
              >
                {t("sessionProgress", {
                  done: Math.min(session.completed, SESSION_LENGTH),
                  total: SESSION_LENGTH,
                })}
              </Typography>
            </Box>
          ) : null}
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

        {exercise.tip ? (
          <Box sx={{ mt: 3 }}>
            <TipPanel
              tip={exercise.tip}
              revealed={tipUsed}
              onReveal={() => setTipUsed(true)}
              disabled={submitted}
            />
          </Box>
        ) : null}

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
              correctAnswer={result.correctAnswer}
            />
            {sessionDone ? (
              <Box
                sx={{
                  mt: 1,
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 3,
                  border: 1,
                  borderStyle: "solid",
                  borderColor: "success.main",
                  backgroundColor: "successSoft.main",
                  textAlign: "center",
                }}
              >
                <Typography variant="h3" sx={{ fontSize: { xs: "1.375rem", sm: "1.625rem" } }}>
                  {t("sessionCompleteTitle")}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
                  {t("sessionSummary", {
                    passed: session.passed,
                    total: SESSION_LENGTH,
                  })}
                </Typography>
                <Button
                  type="button"
                  variant="contained"
                  color="primary"
                  disabled={loadingNext}
                  onClick={onPracticeAgain}
                  sx={{ mt: 2.5, width: { xs: "100%", sm: "auto" } }}
                >
                  {loadingNext ? t("loading") : t("practiceAgain")}
                </Button>
              </Box>
            ) : (
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
            )}
          </Stack>
        ) : null}
      </Card>

      <IntroModal
        type={type}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        initialSkip={initialSkipIntro}
      />
    </>
  );
}
