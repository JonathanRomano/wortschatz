import type { ExerciseType } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { buttonClasses } from "@/components/ui/buttonClasses";

const TYPES: ExerciseType[] = [
  "FILL_IN_THE_BLANK",
  "MULTIPLE_CHOICE",
  "TRANSLATION",
  "WORD_ORDER",
  "MATCHING",
  "LISTENING_COMPREHENSION",
  "READING_COMPREHENSION",
  "VERB_CONJUGATION",
  "ERROR_CORRECTION",
  "FREE_WRITING",
];

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tt = await getTranslations("exerciseTypes");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
      {/* Hero */}
      <section className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Wortschatz · A1 — C2
          </span>
          <h1 className="mt-5 font-display text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("landing.heroBody")}
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link href="/register" className={buttonClasses("primary", "lg")}>
              {t("landing.ctaPrimary")}
            </Link>
            <Link href="/login" className={buttonClasses("secondary", "lg")}>
              {t("landing.ctaSecondary")}
            </Link>
          </div>
        </div>

        {/* Visual side: a stylized exercise card peek */}
        <div className="relative">
          <Card padding="lg" className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                A2 · {tt("FILL_IN_THE_BLANK")}
              </span>
              <MuenzenBadge amount={10} size="sm" />
            </div>
            <p className="mt-5 font-display text-2xl leading-snug sm:text-3xl">
              Ich{" "}
              <span className="inline-block min-w-24 border-b-2 border-accent pb-0.5 text-center align-baseline font-sans text-xl text-accent-foreground">
                esse
              </span>{" "}
              einen Apfel.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Hint · Verb &laquo;essen&raquo;
            </p>
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <span>+10 M when you nail it</span>
              <span className="font-mono">01 / 50</span>
            </div>
          </Card>
          {/* Soft glow behind the card */}
          <div
            aria-hidden="true"
            className="absolute -inset-6 -z-10 rounded-3xl bg-accent/10 blur-2xl"
          />
        </div>
      </section>

      {/* Features */}
      <section className="mt-20 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:mt-28">
        {[
          { title: t("landing.feature1Title"), body: t("landing.feature1Body") },
          { title: t("landing.feature2Title"), body: t("landing.feature2Body") },
          { title: t("landing.feature3Title"), body: t("landing.feature3Body") },
        ].map((f, i) => (
          <Card key={f.title} className="flex flex-col">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <FeatureGlyph index={i} />
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {f.body}
            </p>
          </Card>
        ))}
      </section>

      {/* Exercise types proof strip */}
      <section className="mt-16 sm:mt-20">
        <p className="text-center text-sm text-muted-foreground sm:text-base">
          {locale === "pt"
            ? "Dez tipos de exercício, cada um afina uma habilidade diferente."
            : locale === "tr"
              ? "On alıştırma türü — her biri farklı bir beceriyi geliştirir."
              : locale === "uk"
                ? "Десять типів вправ — кожен тренує свою навичку."
                : "Ten exercise types, each tuning a different skill."}
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5">
          {TYPES.map((tp) => (
            <li
              key={tp}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface/60 p-4 text-center"
            >
              <span className="text-primary">
                <ExerciseTypeIcon type={tp} size={28} />
              </span>
              <span className="text-xs font-medium text-foreground sm:text-sm">
                {tt(tp)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FeatureGlyph({ index }: { index: number }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (index) {
    case 0:
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M5 8c2-2 5-2 7 0s5 2 7 0" />
          <path d="M5 16c2-2 5-2 7 0s5 2 7 0" />
        </svg>
      );
    case 1:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fontFamily="ui-serif, Georgia, serif"
            fill="currentColor"
            stroke="none"
          >
            M
          </text>
        </svg>
      );
    case 2:
    default:
      return (
        <svg {...common}>
          <path d="M5 6h14" />
          <path d="M5 12h14" />
          <path d="M5 18h9" />
          <circle cx="19" cy="18" r="2.5" />
        </svg>
      );
  }
}
