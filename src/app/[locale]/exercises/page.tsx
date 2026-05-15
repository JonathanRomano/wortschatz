import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ExerciseType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { buttonClasses } from "@/components/ui/buttonClasses";

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

export default async function ExercisesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const userId = session.user.id;

  const t = await getTranslations("exercises");
  const tt = await getTranslations("exerciseTypes");
  const td = await getTranslations("exerciseTypeDescriptions");

  const [publishedByType, attemptsByType] = await Promise.all([
    prisma.exercise.groupBy({
      by: ["type"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
    }),
    prisma.userExercise.findMany({
      where: { userId },
      select: { score: true, exercise: { select: { type: true } } },
    }),
  ]);

  const counts: Record<ExerciseType, number> = Object.fromEntries(
    TYPES.map((tp) => [tp, 0]),
  ) as Record<ExerciseType, number>;
  for (const row of publishedByType) counts[row.type] = row._count._all;

  const userByType: Record<ExerciseType, { total: number; correct: number }> =
    Object.fromEntries(
      TYPES.map((tp) => [tp, { total: 0, correct: 0 }]),
    ) as Record<ExerciseType, { total: number; correct: number }>;
  for (const a of attemptsByType) {
    const stat = userByType[a.exercise.type];
    stat.total += 1;
    if (a.score >= 60) stat.correct += 1;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("browseTitle")}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {t("browseSubtitle")}
        </p>
      </header>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {TYPES.map((tp) => {
          const stats = userByType[tp];
          const accuracy =
            stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
          const available = counts[tp];
          const disabled = available === 0;
          return (
            <li key={tp}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                    <ExerciseTypeIcon type={tp} size={22} />
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    {t("available", { count: available })}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-xl font-semibold">
                  {tt(tp)}
                </h2>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {td(tp)}
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{stats.total}</span>
                  <span>·</span>
                  <AccuracyMeter value={accuracy} attempts={stats.total} />
                </div>

                <Link
                  href={`/exercises/${tp}`}
                  aria-disabled={disabled}
                  className={`mt-5 ${buttonClasses(
                    disabled ? "secondary" : "primary",
                    "md",
                    "w-full" + (disabled ? " pointer-events-none cursor-not-allowed opacity-60" : ""),
                  )}`}
                >
                  {t("practice")}
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AccuracyMeter({ value, attempts }: { value: number; attempts: number }) {
  if (attempts === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const tone =
    value >= 80 ? "text-success" : value >= 60 ? "text-accent-foreground" : "text-danger";
  return (
    <span className="flex items-center gap-2">
      <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className={`block h-full ${
            value >= 80 ? "bg-success" : value >= 60 ? "bg-accent" : "bg-danger"
          }`}
          style={{ width: `${value}%` }}
        />
      </span>
      <span className={`font-mono ${tone}`}>{value}%</span>
    </span>
  );
}
