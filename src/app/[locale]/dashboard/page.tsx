import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CefrLevel, ExerciseType } from "@prisma/client";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { LevelChip } from "@/components/ui/LevelChip";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { MuenzenSeriesChart } from "@/components/dashboard/MuenzenSeriesChart.client";
import { ProficiencyRadar } from "@/components/dashboard/ProficiencyRadar.client";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { DailyGoalRing } from "@/components/dashboard/DailyGoalRing";
import { fetchDashboardChartData } from "@/lib/dashboard/queries";
import {
  buildHeatmap,
  buildMuenzenSeries,
  buildRadar,
} from "@/lib/dashboard/aggregations";
import {
  DAILY_GOAL_DEFAULT,
  HEATMAP_DAYS,
  RADAR_LAST_N,
} from "@/lib/dashboard/constants";

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TYPES: ExerciseType[] = [
  "FILL_IN_THE_BLANK",
  "MULTIPLE_CHOICE",
  "TRANSLATION",
  "WORD_ORDER",
  "MATCHING",
  "LISTENING_COMPREHENSION",
  "READING_COMPREHENSION",
  "VERB_CONJUGATION",
  "ERROR_CORRECTION",
  "FREE_WRITING",
];

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tt = await getTranslations("exerciseTypes");
  const tCharts = await getTranslations("dashboard.charts");

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const userId = session.user.id;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { muenzen: true, streak: true, name: true, dailyGoal: true },
  });

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setUTCMonth(monthAgo.getUTCMonth() - 1);

  const [
    total,
    week,
    month,
    attemptsByLevel,
    attemptsByType,
    recent,
    mistakesRows,
    chartData,
  ] = await Promise.all([
    prisma.userExercise.count({ where: { userId } }),
    prisma.userExercise.count({ where: { userId, completedAt: { gte: weekAgo } } }),
    prisma.userExercise.count({ where: { userId, completedAt: { gte: monthAgo } } }),
    prisma.userExercise.findMany({
      where: { userId },
      select: { exercise: { select: { level: true } } },
    }),
    prisma.userExercise.findMany({
      where: { userId },
      select: { exercise: { select: { type: true } } },
    }),
    prisma.userExercise.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 8,
      include: { exercise: { select: { title: true, type: true, level: true } } },
    }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT DISTINCT ON ("exerciseId") "exerciseId", "score"
        FROM "UserExercise"
        WHERE "userId" = ${userId}
        ORDER BY "exerciseId", "completedAt" DESC
      ) latest
      WHERE latest."score" < 60
    `,
    fetchDashboardChartData(userId, now),
  ]);

  const mistakesCount = Number(mistakesRows[0]?.count ?? 0n);

  const levelCounts: Record<CefrLevel, number> = {
    A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0,
  };
  for (const a of attemptsByLevel) levelCounts[a.exercise.level] += 1;

  const typeCounts = {} as Record<ExerciseType, number>;
  for (const tp of TYPES) typeCounts[tp] = 0;
  for (const a of attemptsByType) typeCounts[a.exercise.type] += 1;

  // Build chart-ready data from the raw rows. Done in the server
  // component so the client bundle never sees the raw transactions.
  const muenzenSeries = buildMuenzenSeries(
    chartData.muenzenTxnsInWindow,
    chartData.muenzenStartingBalance,
    chartData.muenzenWindowStart,
    chartData.muenzenWindowEnd,
  );
  const heatmap = buildHeatmap(
    chartData.heatmapAttempts,
    HEATMAP_DAYS,
    chartData.now,
  );
  const typeLabels = TYPES.reduce(
    (acc, type) => {
      acc[type] = tt(type);
      return acc;
    },
    {} as Record<ExerciseType, string>,
  );
  const radar = buildRadar(
    chartData.radarAttempts.map((r) => ({
      type: r.exercise.type,
      score: r.score,
      completedAt: r.completedAt,
    })),
    typeLabels,
    RADAR_LAST_N,
  );
  // `chartData.todayCount` already comes from a dedicated COUNT
  // query — `countToday` in aggregations.ts is exported here for the
  // unit tests rather than re-derived. The user's `dailyGoal` is now
  // configurable from the profile page; `DAILY_GOAL_DEFAULT` is only
  // a fallback if the column is somehow null (defensive — the DB
  // default is the same number).
  const doneToday = chartData.todayCount;
  const dailyGoal = user.dailyGoal ?? DAILY_GOAL_DEFAULT;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 5 } }}>
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
            variant="overline"
            sx={{ color: "text.secondary", display: "block" }}
          >
            {t("dashboard.title")}
          </Typography>
          <Typography variant="h1" sx={{ mt: 0.5, fontSize: { xs: "2rem", sm: "2.5rem" } }}>
            {user.name ?? session.user.email}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <MuenzenBadge amount={user.muenzen} size="lg" />
          <StreakFlame days={user.streak} size="lg" />
        </Stack>
      </Stack>

      {/* Highlights row */}
      <Box
        component="section"
        sx={{
          mt: 3,
          display: "grid",
          gap: { xs: 1.5, sm: 2 },
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}
      >
        <Stat
          label={t("dashboard.muenzenBalance")}
          value={`${user.muenzen}`}
          subtle="M"
          accent
        />
        <Stat
          label={t("dashboard.currentStreak")}
          value={t("dashboard.streakDays", { days: user.streak })}
        />
        <Stat label={t("dashboard.exercisesThisWeek")} value={String(week)} />
        <Stat label={t("dashboard.exercisesThisMonth")} value={String(month)} />
      </Box>

      <Box
        component="section"
        sx={{
          mt: 1.5,
          display: "grid",
          gap: { xs: 1.5, sm: 2 },
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
        }}
      >
        <Stat label={t("dashboard.exercisesTotal")} value={String(total)} />
        <Stat
          label={t("dashboard.toReview")}
          value={String(mistakesCount)}
          accent={mistakesCount > 0}
        />
        <ButtonLink
          href="/exercises/mistakes"
          variant="outlined"
          size="large"
          fullWidth
        >
          {t("dashboard.reviewMistakes")}
        </ButtonLink>
      </Box>

      {/* Row 1 — Münzen series + daily goal ring */}
      <Box
        component="section"
        sx={{
          mt: { xs: 3, sm: 4 },
          display: "grid",
          gap: { xs: 2, sm: 3 },
          gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
        }}
      >
        <ChartCard title={tCharts("muenzenSeries.title")}>
          <MuenzenSeriesChart
            data={muenzenSeries}
            locale={locale}
            emptyMessage={tCharts("muenzenSeries.empty")}
          />
        </ChartCard>
        <ChartCard title={tCharts("dailyGoal.title")}>
          <DailyGoalRing
            done={doneToday}
            goal={dailyGoal}
            progressLabel={tCharts("dailyGoal.progress", {
              done: doneToday,
              goal: dailyGoal,
            })}
            completeLabel={tCharts("dailyGoal.complete")}
          />
        </ChartCard>
      </Box>

      {/* Row 2 — Activity heatmap (full width) */}
      <Box component="section" sx={{ mt: { xs: 2, sm: 3 } }}>
        <ChartCard title={tCharts("activity.title")}>
          <ActivityHeatmap data={heatmap} locale={locale} />
        </ChartCard>
      </Box>

      {/* Row 3 — Radar + by-level + by-type cards */}
      <Box
        component="section"
        sx={{
          mt: { xs: 2, sm: 3 },
          display: "grid",
          gap: { xs: 2, sm: 3 },
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
        }}
      >
        <ChartCard title={tCharts("radar.title")}>
          <ProficiencyRadar
            data={radar}
            emptyMessage={tCharts("radar.empty")}
          />
        </ChartCard>

        <Card>
          <Typography variant="h4">{t("dashboard.byLevel")}</Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {LEVELS.map((l) => (
              <Stack
                key={l}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center" }}
              >
                <Box sx={{ width: 40, display: "flex", justifyContent: "center" }}>
                  <LevelChip level={l} />
                </Box>
                <Bar
                  value={levelCounts[l]}
                  max={Math.max(...Object.values(levelCounts), 1)}
                />
                <Typography
                  variant="caption"
                  sx={{
                    width: 32,
                    textAlign: "right",
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                    color: "text.secondary",
                  }}
                >
                  {levelCounts[l]}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Card>
      </Box>

      {/* By type — full width because 10 rows of label+bar is tall */}
      <Box component="section" sx={{ mt: { xs: 2, sm: 3 } }}>
        <Card>
          <Typography variant="h4">{t("dashboard.byType")}</Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {TYPES.map((tp) => (
              <Stack
                key={tp}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center" }}
              >
                <Box sx={{ color: "primary.main", display: "flex" }}>
                  <ExerciseTypeIcon type={tp} size={18} color="inherit" />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tt(tp)}
                </Typography>
                <Bar
                  value={typeCounts[tp]}
                  max={Math.max(...Object.values(typeCounts), 1)}
                />
                <Typography
                  variant="caption"
                  sx={{
                    width: 32,
                    textAlign: "right",
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                    color: "text.secondary",
                  }}
                >
                  {typeCounts[tp]}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Card>
      </Box>

      <Box component="section" sx={{ mt: { xs: 3, sm: 4 } }}>
        <Card>
          <Typography variant="h4">{t("dashboard.recentActivity")}</Typography>
          {recent.length === 0 ? (
            <Box
              sx={{
                mt: 2,
                p: 3,
                textAlign: "center",
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("dashboard.noActivity")}
              </Typography>
            </Box>
          ) : (
            <Stack
              divider={
                <Box sx={{ borderTop: 1, borderColor: "divider" }} />
              }
              sx={{ mt: 1.5 }}
            >
              {recent.map((r) => (
                <Stack
                  key={r.id}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    py: 1.5,
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ flex: 1, alignItems: "center", minWidth: 0 }}
                  >
                    <LevelChip level={r.exercise.level} size="sm" />
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.exercise.title}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{
                      flexShrink: 0,
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                      color: r.score >= 60 ? "success.main" : "error.main",
                    }}
                  >
                    {r.score}/100
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Card>
      </Box>
    </Container>
  );
}

function Stat({
  label,
  value,
  subtle,
  accent,
}: {
  label: string;
  value: string;
  subtle?: string;
  accent?: boolean;
}) {
  return (
    <Card accent={accent} padding="sm">
      <Typography
        variant="overline"
        sx={{ color: "text.secondary", display: "block" }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ mt: 0.5, alignItems: "baseline" }}
      >
        <Typography
          variant="h3"
          sx={{ fontSize: { xs: "1.5rem", sm: "1.875rem" } }}
        >
          {value}
        </Typography>
        {subtle ? (
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "secondary.main" }}
          >
            {subtle}
          </Typography>
        ) : null}
      </Stack>
    </Card>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <LinearProgress
      variant="determinate"
      value={pct}
      sx={{
        flex: 1,
        minWidth: 0,
        height: 8,
        borderRadius: 9999,
        backgroundColor: "surfaceAlt.main",
        "& .MuiLinearProgress-bar": {
          backgroundColor: "secondary.main",
          borderRadius: 9999,
        },
      }}
    />
  );
}
