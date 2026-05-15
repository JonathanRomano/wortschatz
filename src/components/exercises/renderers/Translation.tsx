"use client";

import { useTranslations } from "next-intl";

import type { RendererProps } from "../types";

export function TranslationRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const source = String(content.sourceText ?? "");
  const lang = String(content.sourceLanguage ?? "en").toUpperCase();
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-alt p-4 sm:p-5">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="font-medium">{t("translationLabelSource")}</span>
          <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-foreground">
            {lang}
          </span>
        </p>
        <p className="mt-2 font-display text-lg leading-relaxed sm:text-2xl">{source}</p>
      </div>
      <textarea
        rows={4}
        placeholder={t("translationPlaceholder")}
        disabled={disabled}
        value={String(value.translation ?? "")}
        onChange={(e) => onChange({ translation: e.target.value })}
        className="block w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-base leading-relaxed shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      />
    </div>
  );
}
