import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CefrLevel, ExerciseType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { pickLocalized } from "@/lib/exercises/i18n";
import { getRandomExerciseOfType } from "@/lib/exercises/actions";
import { Card } from "@/components/ui/Card";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { LevelChip } from "@/components/ui/LevelChip";
import { LevelFilter } from "./LevelFilter";
import { TypeRunner, type LoadedExercise } from "./TypeRunner";
import { ExerciseRunner } from "./ExerciseRunner";

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

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function asType(slug: string): ExerciseType | null {
  return TYPES.includes(slug as ExerciseType) ? (slug as ExerciseType) : null;
}

function asLevel(raw: string | string[] | undefined): CefrLevel | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return undefined;
  const upper = v.toUpperCase();
  return LEVELS.includes(upper as CefrLevel) ? (upper as CefrLevel) : undefined;
}

async function loadExercise(
  id: string,
  locale: Locale,
  userId: string,
): Promise<LoadedExercise | null> {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      instructions: true,
      explanation: true,
      type: true,
      level: true,
      content: true,
      status: true,
    },
  });
  if (!exercise || exercise.status !== "PUBLISHED") return null;

  const priorSuccess = await prisma.userExercise.findFirst({
    where: { userId, exerciseId: id, score: { gte: 60 } },
    select: { id: true },
  });

  return {
    id: exercise.id,
    type: exercise.type,
    level: exercise.level,
    title: exercise.title,
    instructions: pickLocalized(exercise.instructions, locale),
    explanation: pickLocalized(exercise.explanation, locale),
    content: exercise.content as Record<string, unknown>,
    alreadyEarned: Boolean(priorSuccess),
  };
}

export default async function ExerciseSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations("exercises");
  const tt = await getTranslations("exerciseTypes");
  const td = await getTranslations("exerciseTypeDescriptions");
  const tf = await getTranslations("filters");

  const type = asType(slug);
  const level = asLevel(sp.level);

  // Type page: random exercise + Next button.
  if (type) {
    const picked = await getRandomExerciseOfType(type, undefined, level);
    const initial = picked
      ? await loadExercise(picked.id, locale as Locale, session.user.id)
      : null;

    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/exercises"
          className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          ← {t("back")}
        </Link>

        <header className="mt-4 flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary sm:h-14 sm:w-14">
            <ExerciseTypeIcon type={type} size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {tt(type)}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {td(type)}
            </p>
          </div>
        </header>

        <div className="mt-6">
          <LevelFilter
            type={type}
            current={level}
            labels={{
              level: tf("level"),
              all: tf("all"),
            }}
            levels={LEVELS}
          />
        </div>

        {initial ? (
          <TypeRunner type={type} level={level} initialExercise={initial} />
        ) : (
          <Card className="mt-8 text-center" padding="lg">
            <p className="text-sm text-muted-foreground sm:text-base">
              {t("noExercises")}
            </p>
            {level ? (
              <Link
                href={`/exercises/${type}`}
                className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                {tf("clearLevel")}
              </Link>
            ) : null}
          </Card>
        )}
      </div>
    );
  }

  // Detail page: render a specific exercise by id (e.g. "Retry" from
  // the mistakes list).
  const detail = await loadExercise(slug, locale as Locale, session.user.id);
  if (!detail) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/exercises/${detail.type}`}
        className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        ← {t("back")}
      </Link>
      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <LevelChip level={detail.level} />
          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            {tt(detail.type)}
          </span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {detail.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {detail.instructions}
        </p>
      </header>

      <Card className="mt-6" padding="lg">
        <ExerciseRunner
          exerciseId={detail.id}
          type={detail.type}
          content={detail.content}
          explanation={detail.explanation}
          alreadyEarned={detail.alreadyEarned}
        />
      </Card>
    </div>
  );
}
