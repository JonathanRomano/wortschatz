import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/buttonClasses";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const tc = await getTranslations("common");
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center sm:px-6 sm:py-24">
      <p className="font-display text-7xl font-semibold tracking-tight text-primary sm:text-8xl">
        {t("title")}
      </p>
      <p className="mt-4 text-base text-muted-foreground sm:text-lg">
        {t("message")}
      </p>
      <Link href="/" className={`${buttonClasses("primary", "md")} mt-8`}>
        {tc("home")}
      </Link>
    </div>
  );
}
