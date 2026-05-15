import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CefrLevel, ExerciseType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { LevelChip } from "@/components/ui/LevelChip";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { buttonClasses } from "@/components/ui/buttonClasses";

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

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const userId = session.user.id;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { muenzen: true, streak: true, name: true },
  });

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setUTCMonth(monthAgo.getUTCMonth() - 1);

  const [total, week, month, attemptsByLevel, attemptsByType, recent, mistakesRows] =
    await Promise.all([
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
    ]);

  const mistakesCount = Number(mistakesRows[0]?.count ?? 0n);

  const levelCounts: Record<CefrLevel, number> = {
    A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0,
  };
  for (const a of attemptsByLevel) levelCounts[a.exercise.level] += 1;

  const typeCounts = {} as Record<ExerciseType, number>;
  for (const tp of TYPES) typeCounts[tp] = 0;
  for (const a of attemptsByType) typeCounts[a.exercise.type] += 1;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {t("dashboard.title")}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {user.name ?? session.user.email}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MuenzenBadge amount={user.muenzen} size="lg" />
          <StreakFlame days={user.streak} size="lg" />
        </div>
      </header>

      {/* Highlights row */}
      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
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
      </section>

      <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label={t("dashboard.exercisesTotal")} value={String(total)} />
        <Stat
          label={t("dashboard.toReview")}
          value={String(mistakesCount)}
          accent={mistakesCount > 0}
        />
        <Link
          href="/exercises/mistakes"
          className={`${buttonClasses("secondary", "md")} w-full`}
        >
          {t("dashboard.reviewMistakes")}
        </Link>
      </section>

      <section className="mt-8 grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold sm:text-xl">
            {t("dashboard.byLevel")}
          </h2>
          <ul className="mt-4 space-y-3">
            {LEVELS.map((l) => (
              <li key={l} className="flex items-center gap-3 text-sm">
                <LevelChip level={l} className="w-10 justify-center" />
                <Bar value={levelCounts[l]} max={Math.max(...Object.values(levelCounts), 1)} />
                <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground sm:text-sm">
                  {levelCounts[l]}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-semibold sm:text-xl">
            {t("dashboard.byType")}
          </h2>
          <ul className="mt-4 space-y-3">
            {TYPES.map((tp) => (
              <li key={tp} className="flex items-center gap-3 text-xs sm:text-sm">
                <span className="text-primary">
                  <ExerciseTypeIcon type={tp} size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate sm:w-44 sm:flex-none">{tt(tp)}</span>
                <Bar value={typeCounts[tp]} max={Math.max(...Object.values(typeCounts), 1)} />
                <span className="w-8 shrink-0 text-right font-mono text-muted-foreground">
                  {typeCounts[tp]}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-6 sm:mt-8">
        <Card>
          <h2 className="font-display text-lg font-semibold sm:text-xl">
            {t("dashboard.recentActivity")}
          </h2>
          {recent.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("dashboard.noActivity")}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {recent.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <LevelChip level={r.exercise.level} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{r.exercise.title}</span>
                  </span>
                  <span
                    className={`shrink-0 font-mono text-xs sm:text-sm ${
                      r.score >= 60 ? "text-success" : "text-danger"
                    }`}
                  >
                    {r.score}/100
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
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
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-semibold sm:text-3xl">
          {value}
        </span>
        {subtle ? (
          <span className="text-sm font-medium text-accent">{subtle}</span>
        ) : null}
      </div>
    </Card>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-accent transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
