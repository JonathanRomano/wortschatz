"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { MuenzenBadge } from "@/components/ui/MuenzenBadge";

type Props = {
  score: number;
  feedback: string;
  explanation: string;
  reward: number;
  streakBonus: number;
  alreadyEarned: boolean;
  correctAnswer?: string;
  // The user's streak after this attempt. A celebratory line is shown when the
  // streak advanced this attempt (i.e. streakBonus > 0, the first pass of the day).
  newStreak?: number;
};

/**
 * Unified result panel shown after an exercise attempt. Shared between
 * the random-of-type runner and the single-exercise (retry) runner.
 */
export function ExerciseResult({
  score,
  feedback,
  explanation,
  reward,
  streakBonus,
  alreadyEarned,
  correctAnswer,
  newStreak,
}: Props) {
  const t = useTranslations("exercises");
  const passed = score >= 60;
  const totalReward = reward + streakBonus;

  return (
    <Box
      sx={{
        overflow: "hidden",
        borderRadius: 3,
        border: 1,
        borderStyle: "solid",
        borderColor: passed ? "success.main" : "error.main",
        backgroundColor: passed ? "successSoft.main" : "dangerSoft.main",
        boxShadow: 1,
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "center",
          px: { xs: 2.5, sm: 3 },
          py: 2,
          backgroundColor: passed ? "successSoft.main" : "dangerSoft.main",
        }}
      >
        <ScoreRing score={score} passed={passed} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{ color: "text.secondary", display: "block" }}
          >
            {t("score")}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline" }}>
            <Typography variant="h3" sx={{ fontSize: { xs: "1.5rem", sm: "1.875rem" } }}>
              {score}
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              / 100
            </Typography>
          </Stack>
        </Box>
        {totalReward > 0 ? <MuenzenBadge amount={totalReward} size="lg" /> : null}
      </Stack>

      <Stack
        spacing={1.5}
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 2,
          backgroundColor: "background.paper",
          fontSize: { xs: "0.875rem", sm: "1rem" },
          lineHeight: 1.55,
        }}
      >
        <Typography variant="body2">
          <Typography component="span" sx={{ fontWeight: 500, color: "text.primary" }}>
            {t("feedback")}:{" "}
          </Typography>
          <Typography component="span" sx={{ color: "text.secondary" }}>
            {feedback}
          </Typography>
        </Typography>
        {correctAnswer ? (
          <Typography variant="body2">
            <Typography component="span" sx={{ fontWeight: 500, color: "text.primary" }}>
              {t("correctAnswer")}:{" "}
            </Typography>
            <Typography component="span" sx={{ color: "success.main", fontWeight: 500 }}>
              {correctAnswer}
            </Typography>
          </Typography>
        ) : null}
        {explanation ? (
          <Typography variant="body2">
            <Typography component="span" sx={{ fontWeight: 500, color: "text.primary" }}>
              {t("explanation")}:{" "}
            </Typography>
            <Typography component="span" sx={{ color: "text.secondary" }}>
              {explanation}
            </Typography>
          </Typography>
        ) : null}
        {alreadyEarned ? (
          <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
            {t("alreadyEarned")}
          </Typography>
        ) : totalReward > 0 ? (
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "secondary.main" }}
          >
            {t("rewardEarned", { amount: totalReward })}
          </Typography>
        ) : null}
        {streakBonus > 0 && newStreak ? (
          <Typography variant="body2" sx={{ fontWeight: 600, color: "tertiary.main" }}>
            {t("streakDays", { days: newStreak })}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}

function ScoreRing({ score, passed }: { score: number; passed: boolean }) {
  const theme = useTheme();
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <Box component="svg" width={56} height={56} viewBox="0 0 56 56" aria-hidden="true" sx={{ flexShrink: 0 }}>
      <circle
        cx="28"
        cy="28"
        r={r}
        fill={theme.palette.background.paper}
        stroke={theme.palette.divider}
        strokeWidth="4"
      />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={passed ? theme.palette.success.main : theme.palette.error.main}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 28 28)"
      />
      <text
        x="28"
        y="32"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill={theme.palette.text.primary}
        fontFamily="var(--font-inter), system-ui, sans-serif"
      >
        {score}
      </text>
    </Box>
  );
}
