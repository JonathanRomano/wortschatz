"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { CefrLevel } from "@wortschatz/database";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Slider from "@mui/material/Slider";
import Alert from "@mui/material/Alert";

import { PROFESSION_SLUGS, type ProfessionSlug } from "@wortschatz/config";
import { ProfessionChip } from "@/components/ui/ProfessionChip";
import { useRouter } from "@/i18n/navigation";
import { completeSetup, skipSetup } from "./actions";

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TOTAL_STEPS = 3;

type Props = {
  initialLevel: CefrLevel | "";
  initialDailyGoal: number;
};

/**
 * Three-step career onboarding (Sprint 05): profession → current level →
 * goal. Deliberately JS-driven (no per-step form posts) — the final
 * "finish" builds one FormData for `completeSetup`. Every step offers
 * the skip path, which leaves the profile untouched.
 */
export function SetupFlow({ initialLevel, initialDailyGoal }: Props) {
  const t = useTranslations("setup");
  const tProfessions = useTranslations("professions");
  const tDescriptions = useTranslations("professionDescriptions");
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [profession, setProfession] = useState<ProfessionSlug | null>(null);
  const [level, setLevel] = useState<CefrLevel | "">(initialLevel);
  const [targetLevel, setTargetLevel] = useState<CefrLevel | "">("");
  const [dailyGoal, setDailyGoal] = useState(initialDailyGoal);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function finish() {
    if (!profession) return;
    setFailed(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("profession", profession);
      fd.set("learningLevel", level);
      fd.set("targetLevel", targetLevel);
      fd.set("dailyGoal", String(dailyGoal));
      const result = await completeSetup(fd);
      if (result.ok) {
        router.push("/dashboard");
      } else {
        setFailed(true);
      }
    });
  }

  function skip() {
    setFailed(false);
    startTransition(async () => {
      await skipSetup();
      router.push("/dashboard");
    });
  }

  return (
    <Stack spacing={3}>
      <Box>
        <LinearProgress
          variant="determinate"
          value={(step / TOTAL_STEPS) * 100}
          aria-label={t("stepLabel", { current: step, total: TOTAL_STEPS })}
          sx={{ borderRadius: 9999 }}
        />
        <Typography
          variant="caption"
          sx={{ mt: 0.75, display: "block", color: "text.secondary" }}
        >
          {t("stepLabel", { current: step, total: TOTAL_STEPS })}
        </Typography>
      </Box>

      {failed ? <Alert severity="error">{t("error")}</Alert> : null}

      {step === 1 ? (
        <Stack spacing={2}>
          <Typography variant="h3">{t("professionTitle")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("professionHint")}
          </Typography>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROFESSION_SLUGS.map((slug) => {
              const selected = profession === slug;
              return (
                <Button
                  key={slug}
                  type="button"
                  variant={selected ? "contained" : "outlined"}
                  color="primary"
                  aria-pressed={selected}
                  onClick={() => setProfession(slug)}
                  sx={{
                    minHeight: 44,
                    justifyContent: "flex-start",
                    textAlign: "left",
                    textTransform: "none",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 0.5,
                    py: 1.5,
                  }}
                >
                  <ProfessionChip slug={slug} size="sm" />
                  <Typography
                    variant="body2"
                    sx={{
                      color: selected ? "inherit" : "text.secondary",
                    }}
                  >
                    {tDescriptions(slug)}
                  </Typography>
                </Button>
              );
            })}
          </div>
        </Stack>
      ) : null}

      {step === 2 ? (
        <Stack spacing={2}>
          <Typography variant="h3">{t("levelTitle")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("levelHint")}
          </Typography>
          <div className="grid grid-cols-3 gap-3">
            {CEFR_LEVELS.map((l) => (
              <Button
                key={l}
                type="button"
                variant={level === l ? "contained" : "outlined"}
                color="primary"
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
                sx={{ minHeight: 44 }}
              >
                {l}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant={level === "" ? "contained" : "text"}
            color="primary"
            aria-pressed={level === ""}
            onClick={() => setLevel("")}
            sx={{ minHeight: 44, alignSelf: "flex-start" }}
          >
            {t("notSure")}
          </Button>
        </Stack>
      ) : null}

      {step === 3 ? (
        <Stack spacing={2}>
          <Typography variant="h3">{t("goalTitle")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("goalHint")}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {t("targetLevelLabel")}
          </Typography>
          <div className="grid grid-cols-3 gap-3">
            {CEFR_LEVELS.map((l) => (
              <Button
                key={l}
                type="button"
                variant={targetLevel === l ? "contained" : "outlined"}
                color="primary"
                aria-pressed={targetLevel === l}
                onClick={() => setTargetLevel(targetLevel === l ? "" : l)}
                sx={{ minHeight: 44 }}
              >
                {l}
              </Button>
            ))}
          </div>
          <Box sx={{ pt: 1 }}>
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {t("dailyGoalLabel")}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFeatureSettings: '"tnum" 1',
                  color: "secondary.main",
                  fontWeight: 600,
                }}
              >
                {dailyGoal}
              </Typography>
            </Stack>
            <Slider
              value={dailyGoal}
              onChange={(_, value) => {
                if (typeof value === "number") setDailyGoal(value);
              }}
              min={1}
              max={30}
              step={1}
              valueLabelDisplay="auto"
              aria-label={t("dailyGoalLabel")}
              sx={{ color: "secondary.main", mt: 0.5 }}
            />
          </Box>
        </Stack>
      ) : null}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ pt: 1, alignItems: { xs: "stretch", sm: "center" } }}
      >
        {step > 1 ? (
          <Button
            type="button"
            variant="text"
            color="primary"
            disabled={pending}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            sx={{ minHeight: 44 }}
          >
            {t("back")}
          </Button>
        ) : null}
        {step < TOTAL_STEPS ? (
          <Button
            type="button"
            variant="contained"
            color="primary"
            disabled={pending || (step === 1 && !profession)}
            onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
            sx={{ minHeight: 44 }}
          >
            {t("next")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="contained"
            color="primary"
            disabled={pending || !profession}
            onClick={finish}
            sx={{ minHeight: 44 }}
          >
            {pending ? "…" : t("finish")}
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          type="button"
          variant="text"
          color="primary"
          disabled={pending}
          onClick={skip}
          sx={{ minHeight: 44 }}
        >
          {t("skip")}
        </Button>
      </Stack>
    </Stack>
  );
}
