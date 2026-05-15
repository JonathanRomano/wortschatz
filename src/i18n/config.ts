export const locales = ["en", "pt", "tr", "uk"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  tr: "Türkçe",
  uk: "Українська",
};
