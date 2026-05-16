import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  if (!requested || !locales.includes(requested as Locale)) {
    notFound();
  }
  const locale = requested as Locale;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
