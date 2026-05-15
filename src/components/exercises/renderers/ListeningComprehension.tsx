"use client";

import { useTranslations } from "next-intl";

import type { RendererProps } from "../types";

export function ListeningComprehensionRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const transcript = String(content.transcript ?? "");
  const audioUrl = content.audioUrl ? String(content.audioUrl) : null;
  const question = String(content.question ?? "");

  return (
    <div className="space-y-4">
      {audioUrl ? (
        <audio controls src={audioUrl} className="block w-full max-w-full">
          <track kind="captions" />
        </audio>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface-alt p-4 text-sm leading-relaxed sm:p-5">
          <p className="text-muted-foreground">{t("listeningAudioMissing")}</p>
          <p className="mt-3 break-words font-display text-base italic text-foreground sm:text-lg">
            “{transcript}”
          </p>
        </div>
      )}
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
