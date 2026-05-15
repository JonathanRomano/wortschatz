import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");
  const tApp = await getTranslations("app");
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-8">
        <p className="font-display text-base text-foreground">
          {tApp("name")}
          <span aria-hidden="true" className="mx-2 text-accent">·</span>
          <span className="text-sm font-normal text-muted-foreground">
            {tApp("tagline")}
          </span>
        </p>
        <p className="text-balance text-xs text-muted-foreground sm:text-sm">
          © {new Date().getFullYear()} · {t("madeWith")}
        </p>
      </div>
    </footer>
  );
}
