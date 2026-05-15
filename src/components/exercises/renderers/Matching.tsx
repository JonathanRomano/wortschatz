"use client";

import { useTranslations } from "next-intl";

import type { RendererProps } from "../types";

export function MatchingRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const german = (content.german as string[] | undefined) ?? [];
  const translations = (content.translations as string[] | undefined) ?? [];
  const pairs = (value.pairs as Record<string, string> | undefined) ?? {};

  const setPair = (g: string, choice: string) =>
    onChange({ pairs: { ...pairs, [g]: choice } });

  return (
    <div className="space-y-3">
      {german.map((g) => (
        <div
          key={g}
          className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:p-4"
        >
          <span className="min-w-0 break-words font-display text-lg font-semibold sm:w-44 sm:shrink-0 sm:text-xl">
            {g}
          </span>
          <select
            value={pairs[g] ?? ""}
            disabled={disabled}
            onChange={(e) => setPair(g, e.target.value)}
            className="block min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-base transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 sm:flex-1"
            aria-label={t("matchingAria", { term: g })}
          >
            <option value="">{t("matchingPlaceholder")}</option>
            {translations.map((tr) => (
              <option key={tr} value={tr}>
                {tr}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
