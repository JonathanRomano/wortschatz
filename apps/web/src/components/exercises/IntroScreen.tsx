"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ExerciseType } from "@wortschatz/database";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

import { Card } from "@/components/ui/Card";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { setSkipIntro } from "@/lib/preferences/actions";
import { pickLocalized } from "@wortschatz/config";
import type { Locale } from "@/i18n/config";
import { EXERCISE_INTROS } from "@/content/exercise-intros";

type Props = {
  type: ExerciseType;
  // Called after the user dismisses the intro. The persistence side
  // effect (toggle "don't show again") is fire-and-forget — we don't
  // block navigation on the network round-trip.
  onContinue: () => void;
  // Initial value of the "don't show again" checkbox. Defaults to false
  // (the intro is being shown precisely because the user hasn't opted
  // out yet).
  initialSkip?: boolean;
  // When rendered inside a modal we suppress the outer Card chrome.
  embedded?: boolean;
};

/**
 * Per-exercise-type intro ("Vamos lá") screen. Shows a localized
 * three-section explainer plus a "don't show this again" toggle. The
 * dismiss action persists the preference if checked, then calls
 * `onContinue` so the parent can either route into the exercise or
 * close the help modal.
 */
export function IntroScreen({
  type,
  onContinue,
  initialSkip = false,
  embedded = false,
}: Props) {
  const t = useTranslations("exerciseIntros");
  const tt = useTranslations("exerciseTypes");
  const locale = useLocale() as Locale;

  const [skip, setSkip] = useState<boolean>(initialSkip);
  const [pending, startTransition] = useTransition();

  const intro = EXERCISE_INTROS[type];
  const whatItAsks = pickLocalized(intro.whatItAsks, locale);
  const howToInteract = pickLocalized(intro.howToInteract, locale);
  const examplePrompt = pickLocalized(intro.example.prompt, locale);
  const exampleSolved = pickLocalized(intro.example.solvedExplanation, locale);

  const handleContinue = () => {
    // Persist the choice both ways — only when it changed from the
    // initial. We don't await; navigation should feel instant. Errors
    // are silently swallowed (worst case: the intro shows once more).
    if (skip !== initialSkip) {
      startTransition(async () => {
        try {
          await setSkipIntro(type, skip);
        } catch {
          /* ignore */
        }
      });
    }
    onContinue();
  };

  const body = (
    <Stack spacing={3} sx={{ alignItems: "center", textAlign: "center" }}>
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: 96,
          width: 96,
          borderRadius: "50%",
          backgroundColor: "accentSoft.main",
          color: "primary.main",
        }}
      >
        <ExerciseTypeIcon type={type} size={56} color="inherit" />
      </Box>

      <Typography
        variant="h2"
        sx={{ fontSize: { xs: "1.875rem", sm: "2.25rem" } }}
      >
        {tt(type)}
      </Typography>

      <Stack spacing={3} sx={{ width: "100%", textAlign: "left" }}>
        <Section heading={t("whatItAsks")} body={whatItAsks} />
        <Section heading={t("howToInteract")} body={howToInteract} />
        <ExampleSection
          heading={t("example")}
          answerLabel={t("exampleAnswer")}
          prompt={examplePrompt}
          solved={exampleSolved}
        />
      </Stack>

      <Stack
        spacing={2}
        sx={{
          width: "100%",
          alignItems: { xs: "stretch", sm: "center" },
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={skip}
              onChange={(e) => setSkip(e.target.checked)}
              name="skip-intro"
              slotProps={{ input: { "aria-label": t("dontShowAgain") } }}
              sx={{ minHeight: 44, minWidth: 44 }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("dontShowAgain")}
            </Typography>
          }
          sx={{ alignSelf: { xs: "flex-start", sm: "center" }, m: 0 }}
        />
        <Button
          type="button"
          variant="contained"
          color="primary"
          size="large"
          disabled={pending}
          onClick={handleContinue}
          sx={{
            width: { xs: "100%", sm: "auto" },
            minWidth: { sm: 220 },
            minHeight: 48,
          }}
        >
          {t("letsGo")}
        </Button>
      </Stack>
    </Stack>
  );

  if (embedded) {
    return <Box sx={{ px: { xs: 1, sm: 2 }, py: { xs: 2, sm: 3 } }}>{body}</Box>;
  }

  return (
    <Card padding="lg" sx={{ mt: 4 }}>
      {body}
    </Card>
  );
}

function Section({ heading, body }: { heading: string; body: string }) {
  return (
    <Box component="section">
      <Typography variant="h3" sx={{ fontSize: { xs: "1.125rem", sm: "1.25rem" } }}>
        {heading}
      </Typography>
      <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
        {body}
      </Typography>
    </Box>
  );
}

function ExampleSection({
  heading,
  answerLabel,
  prompt,
  solved,
}: {
  heading: string;
  answerLabel: string;
  prompt: string;
  solved: string;
}) {
  return (
    <Box component="section">
      <Typography variant="h3" sx={{ fontSize: { xs: "1.125rem", sm: "1.25rem" } }}>
        {heading}
      </Typography>
      <Box
        sx={{
          mt: 1,
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          backgroundColor: "surfaceAlt.main",
          border: 1,
          borderColor: "divider",
          borderStyle: "solid",
        }}
      >
        <Typography variant="body1">{prompt}</Typography>
        <Typography variant="body2" sx={{ mt: 1.5, color: "text.secondary" }}>
          <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
            {answerLabel}
          </Box>{" "}
          {solved}
        </Typography>
      </Box>
    </Box>
  );
}
