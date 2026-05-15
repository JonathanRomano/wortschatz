"use client";

import { useTranslations } from "next-intl";

import type { RendererProps } from "../types";

export function VerbConjugationRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const infinitive = String(content.infinitive ?? "");
  const pronoun = String(content.pronoun ?? "");
  const tense = String(content.tense ?? "Präsens");
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-alt p-4 sm:p-5">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="font-medium">{t("conjugationOriginal")}</span>
          <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-foreground">
            {tense}
          </span>
        </p>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-display text-xl sm:text-2xl">
          <span className="font-semibold">{pronoun}</span>
          <span className="text-muted-foreground">+</span>
          <span className="font-mono text-lg">{infinitive}</span>
          <span className="text-muted-foreground">→ ?</span>
        </p>
      </div>
      <input
        type="text"
        disabled={disabled}
        value={String(value.conjugated ?? "")}
        onChange={(e) => onChange({ conjugated: e.target.value })}
        placeholder={t("conjugationPlaceholder")}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="block min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2.5 font-display text-lg shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      />
    </div>
  );
}
