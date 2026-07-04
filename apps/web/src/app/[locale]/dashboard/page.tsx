import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";

import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { XpLevelBadge } from "@/components/ui/XpLevelBadge";
import { levelForXp, XP_LEVELS_ENABLED } from "@/lib/muenzen";
import { AchievementsShelf } from "@/components/dashboard/AchievementsShelf";
import { countEarned, deriveAchievements } from "@/content/achievements";
import type { Locale } from "@/i18n/config";
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
  goalMetDays,
  longestStreak,
  weekOverWeek,
} from "@/lib/dashboard/aggregations";
import { DAILY_GOAL_DEFAULT } from "@wortschatz/config";
import {
  HEATMAP_DAYS,
  RADAR_LAST_N,
} from "@/lib/dashboard/constants";
import { CAREER_TRACKS, SETUP_SEEN_COOKIE } from "@/lib/track/flags";
import { fetchTrackData } from "@/lib/track/queries";
import { TrackCard } from "@/components/dashboard/TrackCard";

// Match the levels currently offered on /exercises. Legacy rows at B2+
// are still counted into levelCounts but their breakdown row is hidden.
const LEVELS: CefrLevel[] = ["A1", "A2", "B1"];
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
    select: {
      muenzen: true,
      streak: true,
      name: true,
      dailyGoal: true,
      profession: true,
    },
  });

  // Sprint 05 — first-visit career setup. Only when the browser hasn't
  // seen the flow yet (cookie), so "just learning for myself" users
  // (profession stays NULL by design) aren't bounced back here forever.
  if (CAREER_TRACKS && !user.profession) {
    const jar = await cookies();
    if (!jar.has(SETUP_SEEN_COOKIE)) redirect(`/${locale}/setup`);
  }

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
    passingCount,
    perfectCount,
    lifetimeXpAgg,
    chartData,
    trackData,
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
    prisma.userExercise.count({ where: { userId, score: { gte: 60 } } }),
    prisma.userExercise.count({ where: { userId, score: 100 } }),
    prisma.muenzenTransaction.aggregate({
      where: { userId, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    fetchDashboardChartData(userId, now),
    CAREER_TRACKS ? fetchTrackData(userId, now) : Promise.resolve(null),
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
  // Derived XP level from lifetime earned Münzen (positive transactions only).
  const xp = levelForXp(lifetimeXpAgg._sum.amount ?? 0);
  // Windowed motivation stats derived purely from the 90-day heatmap (no extra
  // query): the best consecutive-day run and how many days the goal was met.
  const bestStreak = longestStreak(heatmap);
  const daysGoalMet = goalMetDays(heatmap, dailyGoal);
  const wow = weekOverWeek(heatmap);
  const weekDelta = wow.thisWeek - wow.lastWeek;
  const weekDeltaLabel = weekDelta > 0 ? `+${weekDelta}` : String(weekDelta);
  // Derived achievement badges (read-only, no persistence).
  const achievementStats = {
    totalPassed: passingCount,
    perfectCount,
    longestStreak: bestStreak,
    goalMetDays: daysGoalMet,
    typesTried: new Set(attemptsByType.map((a) => a.exercise.type)).size,
  };
  const achievements = deriveAchievements(achievementStats);
  const achievementsEarned = countEarned(achievementStats);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 5 } }}>
      {/* Hero — welcome + reward chips. Streak + Münzen are the
          identity carriers, so they sit prominently in the first row
          rather than buried inside the highlights grid. */}
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
            {t("dashboard.welcomeBack")}
          </Typography>
          <Typography
            variant="h1"
            sx={{
              mt: 0.5,
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {user.name ?? session.user.email}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            {t("dashboard.weekRecap", {
              count: wow.thisWeek,
              delta: weekDeltaLabel,
            })}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <StreakFlame days={user.streak} size="lg" />
          <MuenzenBadge amount={user.muenzen} size="lg" />
          {XP_LEVELS_ENABLED ? (
            <XpLevelBadge level={xp.level} progressPct={xp.progressPct} size="lg" />
          ) : null}
        </Stack>
      </Stack>

      {/* Dein Weg teaser (Sprint 05) — only for users with a career track. */}
      {trackData?.progress ? (
        <Box sx={{ mt: { xs: 2, sm: 3 } }}>
          <TrackCard
            profession={trackData.progress.track.profession}
            percent={trackData.progress.percent}
            doneToday={trackData.plan.filter((p) => p.done).length}
            planTotal={trackData.plan.length}
          />
        </Box>
      ) : null}

      {/* Highlights — totals only. Münzen + streak already in the hero,
          so they're not duplicated here. */}
      <Box
        component="section"
        sx={{
          mt: 3,
          display: "grid",
          gap: { xs: 1.5, sm: 2 },
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
        }}
      >
        <Stat label={t("dashboard.exercisesThisWeek")} value={String(week)} />
        <Stat label={t("dashboard.exercisesThisMonth")} value={String(month)} />
        <Stat label={t("dashboard.exercisesTotal")} value={String(total)} />
        <Stat label={t("dashboard.longestStreak")} value={String(bestStreak)} />
        <Stat label={t("dashboard.goalMetDays")} value={String(daysGoalMet)} />
        <Stat
          label={t("dashboard.toReview")}
          value={String(mistakesCount)}
          accent={mistakesCount > 0}
        />
      </Box>

      <Box sx={{ mt: { xs: 1.5, sm: 2 } }}>
        <ButtonLink
          href="/exercises/mistakes"
          variant="outlined"
          size="large"
        >
          {t("dashboard.reviewMistakes")}
        </ButtonLink>
      </Box>

      <AchievementsShelf
        items={achievements}
        locale={locale as Locale}
        earnedCount={achievementsEarned}
      />

      {/* Row 1 — Daily goal ring + recent activity. Putting them side
          by side gives the user a "today" + "what just happened" view
          before the heavier charts. */}
      <Box
        component="section"
        sx={{
          mt: { xs: 3, sm: 4 },
          display: "grid",
          gap: { xs: 2, sm: 3 },
          gridTemplateColumns: { xs: "1fr", md: "1fr 2fr" },
          alignItems: "stretch",
        }}
      >
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
              {recent.slice(0, 5).map((r) => (
                <Stack
                  key={r.id}
                  direction="row"
                  spacing={1.5}
                  sx={{
                    py: 1.25,
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

      {/* Row 2 — Performance radar (full width, larger). The radar
          benefits most from horizontal space. */}
      <Box component="section" sx={{ mt: { xs: 2, sm: 3 } }}>
        <ChartCard title={tCharts("radar.title")}>
          <ProficiencyRadar
            data={radar}
            emptyMessage={tCharts("radar.empty")}
          />
        </ChartCard>
      </Box>

      {/* Row 3 — Münzen history (full width). */}
      <Box component="section" sx={{ mt: { xs: 2, sm: 3 } }}>
        <ChartCard title={tCharts("muenzenSeries.title")}>
          <MuenzenSeriesChart
            data={muenzenSeries}
            locale={locale}
            emptyMessage={tCharts("muenzenSeries.empty")}
          />
        </ChartCard>
      </Box>

      {/* Row 4 — Activity heatmap (full width). */}
      <Box component="section" sx={{ mt: { xs: 2, sm: 3 } }}>
        <ChartCard title={tCharts("activity.title")}>
          <ActivityHeatmap data={heatmap} locale={locale} />
        </ChartCard>
      </Box>

      {/* Row 5 — By-level + by-type breakdowns. Demoted below the
          main charts because they're reference data, not headline. */}
      <Box
        component="section"
        sx={{
          mt: { xs: 2, sm: 3 },
          display: "grid",
          gap: { xs: 2, sm: 3 },
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
        }}
      >
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
