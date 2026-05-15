import type { CefrLevel } from "@prisma/client";

const tone: Record<CefrLevel, string> = {
  A1: "border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300",
  A2: "border-teal-300/60 bg-teal-50 text-teal-800 dark:border-teal-500/40 dark:bg-teal-950/40 dark:text-teal-300",
  B1: "border-sky-300/60 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-950/40 dark:text-sky-300",
  B2: "border-indigo-300/60 bg-indigo-50 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-950/40 dark:text-indigo-300",
  C1: "border-purple-300/60 bg-purple-50 text-purple-800 dark:border-purple-500/40 dark:bg-purple-950/40 dark:text-purple-300",
  C2: "border-rose-300/60 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300",
};

export function LevelChip({
  level,
  size = "md",
  className = "",
}: {
  level: CefrLevel;
  size?: "sm" | "md";
  className?: string;
}) {
  const sz =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono font-semibold uppercase tracking-wide ${tone[level]} ${sz} ${className}`}
    >
      {level}
    </span>
  );
}
