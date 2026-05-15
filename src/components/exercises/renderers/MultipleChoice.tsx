"use client";

import type { RendererProps } from "../types";

export function MultipleChoiceRenderer({ content, value, onChange, disabled }: RendererProps) {
  const question = String(content.question ?? "");
  const options = (content.options as string[] | undefined) ?? [];
  const selected = typeof value.selectedIndex === "number" ? value.selectedIndex : -1;

  return (
    <div className="space-y-4">
      <p className="font-display text-lg font-semibold leading-relaxed sm:text-2xl">
        {question}
      </p>
      <div className="grid gap-2">
        {options.map((opt, i) => {
          const checked = selected === i;
          return (
            <label
              key={i}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-base transition-all ${
                checked
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-surface hover:-translate-y-px hover:bg-muted"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="mc-option"
                checked={checked}
                onChange={() => onChange({ selectedIndex: i })}
                disabled={disabled}
                className="h-5 w-5 shrink-0 accent-primary"
              />
              <span className="min-w-0 flex-1 break-words">{opt}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
