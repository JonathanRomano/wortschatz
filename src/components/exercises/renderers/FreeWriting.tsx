"use client";

import { useTranslations } from "next-intl";

import type { RendererProps } from "../types";

export function FreeWritingRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const prompt = String(content.prompt ?? "");
  const minWords = Number(content.minWords ?? 40);
  const text = String(value.text ?? "");
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const reachedMin = wordCount >= minWords;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-alt p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("freeWritingPrompt")}
        </p>
        <p className="mt-2 break-words font-display text-lg leading-relaxed sm:text-xl">
          {prompt}
        </p>
      </div>
      <textarea
        rows={8}
        disabled={disabled}
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={t("freeWritingPlaceholder")}
        className="block w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-base leading-relaxed shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      />
      <div className="flex items-center justify-between text-sm">
        <p
          className={`flex items-center gap-2 font-mono ${
            reachedMin ? "text-success" : "text-muted-foreground"
          }`}
        >
          {reachedMin ? <Check /> : null}
          {t("freeWritingWordCount", { count: wordCount, min: minWords })}
        </p>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5 9-12" />
    </svg>
  );
}
