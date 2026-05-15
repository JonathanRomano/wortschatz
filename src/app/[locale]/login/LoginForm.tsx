"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { buttonClasses } from "@/components/ui/buttonClasses";
import { signInWithCredentials, signInWithGoogle } from "./actions";

const inputClass =
  "mt-1.5 block min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export function LoginForm() {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const res = await signInWithCredentials(formData);
            if (res?.error) setError(t(res.error));
          });
        }}
        className="space-y-4"
      >
        <label className="block text-sm font-medium">
          {t("email")}
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className={inputClass}
          />
        </label>
        <label className="block text-sm font-medium">
          {t("password")}
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className={`${buttonClasses("primary", "md")} w-full`}
        >
          {pending ? "…" : t("submitLogin")}
        </button>
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-danger/40 bg-danger-soft/60 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <hr className="flex-1 border-border" />
        <span>{t("or")}</span>
        <hr className="flex-1 border-border" />
      </div>

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className={`${buttonClasses("secondary", "md")} w-full`}
        >
          {t("googleLogin")}
        </button>
      </form>
    </div>
  );
}
