"use client";

import { useTranslations } from "next-intl";

import type { RendererProps } from "../types";

export function WordOrderRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const scrambled = (content.scrambled as string[] | undefined) ?? [];
  const ordered = (value.ordered as string[] | undefined) ?? [];

  const remaining = (() => {
    const counts = new Map<string, number>();
    for (const w of scrambled) counts.set(w, (counts.get(w) ?? 0) + 1);
    for (const w of ordered) counts.set(w, (counts.get(w) ?? 0) - 1);
    return scrambled.filter((w) => {
      const c = counts.get(w) ?? 0;
      if (c <= 0) return false;
      counts.set(w, c - 1);
      return true;
    });
  })();

  const pick = (word: string) => onChange({ ordered: [...ordered, word] });
  const popLast = () => onChange({ ordered: ordered.slice(0, -1) });
  const reset = () => onChange({ ordered: [] });

  return (
    <div className="space-y-4">
      <div className="min-h-[4rem] rounded-xl border-2 border-dashed border-border bg-surface-alt p-4 sm:p-5">
        {ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground sm:text-base">
            {t("wordOrderEmpty")}
          </p>
        ) : (
          <p className="break-words font-display text-lg leading-relaxed sm:text-2xl">
            {ordered.join(" ")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {remaining.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => pick(w)}
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3.5 py-2 text-base shadow-sm transition-all hover:-translate-y-px hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {w}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <button
          type="button"
          onClick={popLast}
          disabled={disabled || ordered.length === 0}
          className="inline-flex min-h-9 items-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("wordOrderUndo")}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={disabled || ordered.length === 0}
          className="inline-flex min-h-9 items-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("wordOrderReset")}
        </button>
      </div>
    </div>
  );
}
