"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { buttonClasses } from "@/components/ui/buttonClasses";
import { submitReviewRequest } from "@/lib/review/actions";

export function ReviewForm({ balance, cost }: { balance: number; cost: number }) {
  const t = useTranslations("review");
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(balance);
  const [pending, startTransition] = useTransition();

  const insufficient = remaining < cost;
  const tooShort = text.trim().length < 5;

  return (
    <div className="space-y-4">
      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        className="block w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-base leading-relaxed shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          {t("balanceLine", { balance: remaining, cost })}
        </span>
        <button
          type="button"
          disabled={pending || insufficient || tooShort}
          onClick={() => {
            setError(null);
            setFeedback(null);
            startTransition(async () => {
              const res = await submitReviewRequest(text);
              if (!res.ok) {
                setError(res.error === "insufficient_funds" ? t("insufficientFunds") : "Error");
              } else {
                setFeedback(res.feedback);
                setRemaining(res.remainingMuenzen);
                setText("");
              }
            });
          }}
          className={buttonClasses("primary", "md", "w-full sm:w-auto")}
        >
          {pending ? "…" : t("submit")}
        </button>
      </div>

      {insufficient ? (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger-soft/60 px-3 py-2 text-sm text-danger"
        >
          {t("insufficientFunds")}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger-soft/60 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {feedback ? (
        <div className="rounded-xl border border-border bg-muted p-4 shadow-sm sm:p-5">
          <h2 className="font-display text-lg font-semibold sm:text-xl">
            {t("feedbackHeading")}
          </h2>
          <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {feedback}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
