"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CefrLevel, ExerciseType } from "@prisma/client";

import { ExerciseRenderer } from "@/components/exercises/renderers";
import { ExerciseResult } from "@/components/exercises/ExerciseResult";
import {
  submitExerciseAttempt,
  type SubmitResult,
} from "@/lib/exercises/actions";
import type { Locale } from "@/i18n/config";
import { Card } from "@/components/ui/Card";
import { LevelChip } from "@/components/ui/LevelChip";
import { buttonClasses } from "@/components/ui/buttonClasses";
import { fetchNextExerciseOfType } from "./actions";

export type LoadedExercise = {
  id: string;
  type: ExerciseType;
  level: CefrLevel;
  title: string;
  instructions: string;
  explanation: string;
  content: Record<string, unknown>;
  alreadyEarned: boolean;
};

type Props = {
  type: ExerciseType;
  // Optional level filter coming from the page's search params.
  level?: CefrLevel;
  initialExercise: LoadedExercise;
};

export function TypeRunner({ type, level, initialExercise }: Props) {
  const t = useTranslations("exercises");
  const locale = useLocale() as Locale;

  const [exercise, setExercise] = useState<LoadedExercise>(initialExercise);
  const [answer, setAnswer] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [loadingNext, startNext] = useTransition();

  const submitted = result?.ok === true;

  const onSubmit = () => {
    startSubmit(async () => {
      const r = await submitExerciseAttempt(exercise.id, answer);
      setResult(r);
    });
  };

  const onNext = () => {
    startNext(async () => {
      const next = await fetchNextExerciseOfType(type, locale, exercise.id, level);
      if (next) {
        setExercise(next);
        setAnswer({});
        setResult(null);
      }
    });
  };

  return (
    <Card className="mt-8" padding="lg">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <LevelChip level={exercise.level} />
        </div>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {exercise.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {exercise.instructions}
        </p>
      </header>

      {exercise.alreadyEarned ? (
        <p className="mt-5 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("alreadyEarned")}
        </p>
      ) : null}

      <div className="mt-6">
        <ExerciseRenderer
          type={type}
          content={exercise.content}
          value={answer}
          onChange={setAnswer}
          disabled={submitted}
        />
      </div>

      {!submitted ? (
        <button
          type="button"
          disabled={submitting}
          onClick={onSubmit}
          className={`mt-6 ${buttonClasses("primary", "md", "w-full sm:w-auto")}`}
        >
          {submitting ? t("loading") : t("submit")}
        </button>
      ) : null}

      {result && !result.ok ? (
        <p
          role="alert"
          className="mt-6 rounded-md border border-danger/40 bg-danger-soft/60 px-3 py-2 text-sm text-danger"
        >
          {result.error}
        </p>
      ) : null}

      {result?.ok ? (
        <div className="mt-6 space-y-4">
          <ExerciseResult
            score={result.score}
            feedback={result.feedback}
            explanation={exercise.explanation}
            reward={result.reward}
            streakBonus={result.streakBonus}
            alreadyEarned={result.alreadyEarned}
          />
          <button
            type="button"
            onClick={onNext}
            disabled={loadingNext}
            className={buttonClasses("primary", "md", "w-full sm:w-auto")}
          >
            {loadingNext ? t("loading") : t("next")}
          </button>
        </div>
      ) : null}
    </Card>
  );
}
