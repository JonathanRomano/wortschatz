"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("nav");

  return (
    <select
      aria-label={t("language")}
      value={locale}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Locale;
        startTransition(() => {
          router.replace(pathname, { locale: next });
        });
      }}
      className="min-h-11 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-auto sm:min-h-9"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}
