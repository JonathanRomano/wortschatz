"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { CefrLevel, ExerciseStatus, ExerciseType } from "@prisma/client";

import { LevelChip } from "@/components/ui/LevelChip";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { buttonClasses } from "@/components/ui/buttonClasses";
import { setExerciseStatus } from "./actions";

export function AdminExerciseRow({
  id,
  title,
  type,
  level,
  status: initialStatus,
}: {
  id: string;
  title: string;
  type: ExerciseType;
  level: CefrLevel;
  status: ExerciseStatus;
}) {
  const t = useTranslations("admin");
  const tt = useTranslations("exerciseTypes");
  const [status, setStatus] = useState<ExerciseStatus>(initialStatus);
  const [pending, startTransition] = useTransition();

  const change = (next: ExerciseStatus) =>
    startTransition(async () => {
      await setExerciseStatus(id, next);
      setStatus(next);
    });

  return (
    <li className="flex flex-col gap-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <LevelChip level={level} size="sm" />
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ExerciseTypeIcon type={type} size={14} />
            {tt(type)}
          </span>
        </div>
        <p className="mt-1 break-words font-medium">{title}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <StatusBadge status={status} />
        {status === "DRAFT" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => change("PUBLISHED")}
              className={buttonClasses("primary", "sm")}
            >
              {t("approve")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => change("ARCHIVED")}
              className={buttonClasses("secondary", "sm")}
            >
              {t("reject")}
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: ExerciseStatus }) {
  const cls =
    status === "PUBLISHED"
      ? "border-success/40 bg-success-soft/60 text-success"
      : status === "ARCHIVED"
        ? "border-border bg-muted text-muted-foreground"
        : "border-accent/40 bg-accent-soft text-accent-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}
