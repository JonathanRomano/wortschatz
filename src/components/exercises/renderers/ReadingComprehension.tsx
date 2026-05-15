"use client";

import { useTranslations } from "next-intl";

import type { RendererProps } from "../types";

export function ReadingComprehensionRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const passage = String(content.passage ?? "");
  const question = String(content.question ?? "");
  return (
    <div className="space-y-4 sm:space-y-5">
      <article className="rounded-xl border border-border bg-surface-alt p-4 font-display text-lg leading-relaxed whitespace-pre-line sm:p-6 sm:text-xl sm:leading-relaxed">
        {passage}
      </article>
      <p className="font-display text-lg font-semibold leading-relaxed sm:text-xl">
        {question}
      </p>
      <textarea
        rows={4}
        placeholder={t("listeningAnswerPlaceholder")}
        disabled={disabled}
        value={String(value.answer ?? "")}
        onChange={(e) => onChange({ answer: e.target.value })}
        className="block w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-base leading-relaxed shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      />
    </div>
  );
}
