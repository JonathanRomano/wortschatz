"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { UiLanguage } from "@prisma/client";

import { buttonClasses } from "@/components/ui/buttonClasses";
import { saveProfile } from "./actions";

const LANGS: { code: UiLanguage; label: string }[] = [
  { code: "EN", label: "English" },
  { code: "PT", label: "Português" },
  { code: "TR", label: "Türkçe" },
  { code: "UK", label: "Українська" },
];

const inputClass =
  "mt-1.5 block min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export function ProfileForm({
  name: initialName,
  email,
  preferredLanguage,
}: {
  name: string;
  email: string;
  preferredLanguage: UiLanguage;
}) {
  const t = useTranslations("profile");
  const [name, setName] = useState(initialName);
  const [lang, setLang] = useState<UiLanguage>(preferredLanguage);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setSaved(false);
        startTransition(async () => {
          await saveProfile(formData);
          setSaved(true);
        });
      }}
      className="space-y-4"
    >
      <label className="block text-sm font-medium">
        {t("name")}
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        {t("email")}
        <input
          value={email}
          disabled
          className={`${inputClass} bg-muted text-muted-foreground`}
        />
      </label>
      <label className="block text-sm font-medium">
        {t("preferredLanguage")}
        <select
          name="preferredLanguage"
          value={lang}
          onChange={(e) => setLang(e.target.value as UiLanguage)}
          className={inputClass}
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending}
          className={buttonClasses("primary", "md", "w-full sm:w-auto")}
        >
          {pending ? "…" : t("save")}
        </button>
        {saved ? (
          <p className="text-sm font-medium text-success">{t("saved")}</p>
        ) : null}
      </div>
    </form>
  );
}
