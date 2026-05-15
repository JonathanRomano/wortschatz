"use client";

import { useTranslations } from "next-intl";

import type { RendererProps } from "../types";

export function ErrorCorrectionRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const sentence = String(content.sentence ?? "");
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-danger/30 bg-danger-soft/30 p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-danger">
          {t("errorOriginal")}
        </p>
        <p className="mt-2 break-words font-display text-lg leading-relaxed sm:text-xl">
          {sentence}
        </p>
      </div>
      <textarea
        rows={3}
        disabled={disabled}
        value={String(value.corrected ?? "")}
        onChange={(e) => onChange({ corrected: e.target.value })}
        placeholder={t("errorCorrectedPlaceholder")}
        className="block w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-base leading-relaxed shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      />
    </div>
  );
}
