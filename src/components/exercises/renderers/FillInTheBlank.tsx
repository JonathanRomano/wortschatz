"use client";

import { useTranslations } from "next-intl";

import type { RendererProps } from "../types";

export function FillInTheBlankRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const sentence = String(content.sentence ?? "");
  const blanksCount = Number(content.blanksCount ?? sentence.split("___").length - 1);
  const blanks = Array.isArray(value.blanks)
    ? (value.blanks as string[])
    : Array(blanksCount).fill("");

  const setBlank = (i: number, v: string) => {
    const next = [...blanks];
    next[i] = v;
    onChange({ blanks: next });
  };

  const parts = sentence.split("___");
  return (
    <div className="space-y-4">
      <p className="font-display text-lg leading-relaxed sm:text-2xl sm:leading-loose">
        {parts.map((part, i) => (
          <span key={i} className="break-words">
            {part}
            {i < parts.length - 1 && (
              <input
                type="text"
                value={blanks[i] ?? ""}
                onChange={(e) => setBlank(i, e.target.value)}
                disabled={disabled}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="mx-1 inline-block min-h-10 w-full max-w-[10rem] rounded-md border-b-2 border-accent/70 bg-transparent px-2 py-1 font-sans text-base shadow-[0_2px_0_0_var(--accent-soft)] transition focus:border-accent focus:outline-none disabled:opacity-60 sm:min-h-9 sm:w-32"
                aria-label={t("blankAria", { n: i + 1 })}
              />
            )}
          </span>
        ))}
      </p>
      {content.hint ? (
        <p className="rounded-md border border-accent/30 bg-accent-soft/40 px-3 py-2 text-sm text-foreground">
          <span className="font-semibold text-accent-foreground">{t("hint")}:</span>{" "}
          {String(content.hint)}
        </p>
      ) : null}
    </div>
  );
}
