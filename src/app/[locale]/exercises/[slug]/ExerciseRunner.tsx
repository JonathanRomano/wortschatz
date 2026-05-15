"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ExerciseType } from "@prisma/client";

import { ExerciseRenderer } from "@/components/exercises/renderers";
import { ExerciseResult } from "@/components/exercises/ExerciseResult";
import {
  submitExerciseAttempt,
  type SubmitResult,
} from "@/lib/exercises/actions";
import { useRouter } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/buttonClasses";

type Props = {
  exerciseId: string;
  type: ExerciseType;
  content: Record<string, unknown>;
  explanation: string;
  alreadyEarned?: boolean;
};

export function ExerciseRunner({
  exerciseId,
  type,
  content,
  explanation,
  alreadyEarned,
}: Props) {
  const t = useTranslations("exercises");
  const [answer, setAnswer] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submitted = result?.ok === true;

  return (
    <div className="space-y-6">
      {alreadyEarned ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("alreadyEarned")}
        </p>
      ) : null}

      <ExerciseRenderer
        type={type}
        content={content}
        value={answer}
        onChange={setAnswer}
        disabled={submitted}
      />

      {!submitted ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await submitExerciseAttempt(exerciseId, answer);
              setResult(r);
            })
          }
          className={buttonClasses("primary", "md", "w-full sm:w-auto")}
        >
          {pending ? t("loading") : t("submit")}
        </button>
      ) : null}

      {result && !result.ok ? (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger-soft/60 px-3 py-2 text-sm text-danger"
        >
          {result.error}
        </p>
      ) : null}

      {result?.ok ? (
        <div className="space-y-4">
          <ExerciseResult
            score={result.score}
            feedback={result.feedback}
            explanation={explanation}
            reward={result.reward}
            streakBonus={result.streakBonus}
            alreadyEarned={result.alreadyEarned}
          />
          <button
            type="button"
            onClick={() => router.push(`/exercises/${type}`)}
            className={buttonClasses("secondary", "md", "w-full sm:w-auto")}
          >
            {t("next")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
