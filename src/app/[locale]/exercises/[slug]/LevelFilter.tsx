"use client";

import type { CefrLevel, ExerciseType } from "@prisma/client";

import { useRouter } from "@/i18n/navigation";

type Props = {
  type: ExerciseType;
  current: CefrLevel | undefined;
  levels: CefrLevel[];
  labels: { level: string; all: string };
};

export function LevelFilter({ type, current, levels, labels }: Props) {
  const router = useRouter();

  const go = (next: CefrLevel | "") => {
    const qs = next ? `?level=${next}` : "";
    router.replace(`/exercises/${type}${qs}`);
  };

  const isAll = !current;

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {labels.level}
      </span>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={isAll} onClick={() => go("")}>
          {labels.all}
        </Chip>
        {levels.map((l) => (
          <Chip key={l} active={current === l} onClick={() => go(l)}>
            {l}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-surface text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
