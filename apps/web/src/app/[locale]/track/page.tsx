import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PlayCircleRoundedIcon from "@mui/icons-material/PlayCircleRounded";
import HourglassEmptyRoundedIcon from "@mui/icons-material/HourglassEmptyRounded";

import { auth } from "@/auth";
import { pickLocalized } from "@wortschatz/config";
import type { ExerciseType } from "@wortschatz/database";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProfessionChip } from "@/components/ui/ProfessionChip";
import { LevelChip } from "@/components/ui/LevelChip";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { CAREER_TRACKS } from "@/lib/track/flags";
import { fetchTrackData } from "@/lib/track/queries";
import type { UnitProgress } from "@/lib/track/engine";
import type { Locale } from "@/i18n/config";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  if (!CAREER_TRACKS) redirect(`/${locale}/dashboard`);

  const t = await getTranslations("track");
  const tTypes = await getTranslations("exerciseTypes");
  const { progress, plan, targetLevel } = await fetchTrackData(session.user.id);

  // No profession chosen (skipped setup / stale slug) → invite, don't trap.
  if (!progress) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 }, px: { xs: 2, sm: 3 } }}>
        <Card padding="lg">
          <Typography variant="h2">{t("noProfessionTitle")}</Typography>
          <Typography variant="body1" sx={{ mt: 1.5, color: "text.secondary" }}>
            {t("noProfessionBody")}
          </Typography>
          <ButtonLink
            href="/setup"
            variant="contained"
            color="primary"
            sx={{ mt: 3, minHeight: 44 }}
          >
            {t("noProfessionCta")}
          </ButtonLink>
        </Card>
      </Container>
    );
  }

  const hasContent = progress.units.some((u) => u.total > 0);
  const allDone = hasContent && progress.currentIndex === -1;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 5 }, px: { xs: 2, sm: 3 } }}>
      {/* Header — profession identity + the goal it's all pointed at. */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "2rem", sm: "2.5rem" },
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {t("title")}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            {t("subtitle")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <ProfessionChip slug={progress.track.profession} />
          {targetLevel ? (
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              {t("goal", { level: targetLevel })}
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      {/* Overall progress */}
      {hasContent ? (
        <Card padding="md" sx={{ mt: 3 }}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {allDone
                ? t("trackComplete")
                : t("progressLabel", { percent: progress.percent })}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", fontFeatureSettings: '"tnum" 1' }}
            >
              {progress.totalPassed}/{progress.totalTarget}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress.percent}
            aria-label={t("progressLabel", { percent: progress.percent })}
            sx={{ mt: 1.5, height: 8, borderRadius: 9999 }}
          />
        </Card>
      ) : (
        <Card padding="lg" sx={{ mt: 3 }}>
          <Typography variant="h3">{t("noContentTitle")}</Typography>
          <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
            {t("noContentBody")}
          </Typography>
          <ButtonLink
            href="/exercises"
            variant="outlined"
            color="primary"
            sx={{ mt: 2.5, minHeight: 44 }}
          >
            {t("noContentCta")}
          </ButtonLink>
        </Card>
      )}

      {/* Today's plan */}
      {hasContent ? (
        <Card padding="md" sx={{ mt: 3 }} component="section">
          <Typography variant="h3" sx={{ fontSize: "1.25rem" }}>
            {t("today")}
          </Typography>
          {plan.length === 0 ? (
            <Typography variant="body2" sx={{ mt: 1.5, color: "text.secondary" }}>
              {t("todayEmpty")}
            </Typography>
          ) : (
            <Stack spacing={1} sx={{ mt: 2 }}>
              {plan.map((item) => (
                <Stack
                  key={item.exercise.id}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: "center",
                    minHeight: 44,
                    opacity: item.done ? 0.65 : 1,
                  }}
                >
                  {item.done ? (
                    <CheckCircleRoundedIcon
                      sx={{ color: "success.main", fontSize: 22 }}
                      titleAccess={t("done")}
                    />
                  ) : (
                    <ExerciseTypeIcon
                      type={item.exercise.type as ExerciseType}
                      size={22}
                      color="primary"
                    />
                  )}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textDecoration: item.done ? "line-through" : "none",
                      }}
                    >
                      {item.exercise.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {tTypes(item.exercise.type as ExerciseType)}
                    </Typography>
                  </Box>
                  {!item.done ? (
                    <ButtonLink
                      href={`/exercises/${item.exercise.id}`}
                      variant="outlined"
                      color="primary"
                      size="small"
                      sx={{ minHeight: 44, flexShrink: 0 }}
                    >
                      {t("start")}
                    </ButtonLink>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          )}
        </Card>
      ) : null}

      {/* Units */}
      <Box component="section" sx={{ mt: 3 }}>
        <Typography variant="h3" sx={{ fontSize: "1.25rem" }}>
          {t("units")}
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {progress.units.map((u) => (
            <UnitRow
              key={u.unit.slug}
              u={u}
              locale={locale as Locale}
              unitProgressLabel={t("unitProgress", {
                passed: Math.min(u.passed, u.target),
                target: u.target,
              })}
              lockedLabel={t("locked")}
              comingSoonLabel={t("comingSoon")}
            />
          ))}
        </Stack>
      </Box>
    </Container>
  );
}

function UnitRow({
  u,
  locale,
  unitProgressLabel,
  lockedLabel,
  comingSoonLabel,
}: {
  u: UnitProgress;
  locale: Locale;
  unitProgressLabel: string;
  lockedLabel: string;
  comingSoonLabel: string;
}) {
  const dimmed = u.state === "locked" || u.state === "empty";
  return (
    <Card
      padding="md"
      sx={{
        opacity: dimmed ? 0.6 : 1,
        ...(u.state === "current"
          ? { borderColor: "primary.main", borderWidth: 2 }
          : {}),
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        {u.state === "done" ? (
          <CheckCircleRoundedIcon sx={{ color: "success.main" }} />
        ) : u.state === "current" ? (
          <PlayCircleRoundedIcon sx={{ color: "primary.main" }} />
        ) : u.state === "empty" ? (
          <HourglassEmptyRoundedIcon sx={{ color: "text.disabled" }} />
        ) : (
          <LockRoundedIcon sx={{ color: "text.disabled" }} titleAccess={lockedLabel} />
        )}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {pickLocalized(u.unit.title, locale)}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {u.state === "empty" ? comingSoonLabel : unitProgressLabel}
          </Typography>
        </Box>
        <LevelChip level={u.unit.level} size="sm" />
      </Stack>
      {u.state !== "empty" ? (
        <LinearProgress
          variant="determinate"
          value={u.target === 0 ? 0 : Math.min(100, (100 * u.passed) / u.target)}
          aria-label={unitProgressLabel}
          sx={{ mt: 1.5, height: 6, borderRadius: 9999 }}
        />
      ) : null}
    </Card>
  );
}
