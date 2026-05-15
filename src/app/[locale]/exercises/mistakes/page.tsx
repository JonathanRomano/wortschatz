import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ExerciseType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { buttonClasses } from "@/components/ui/buttonClasses";

type Row = {
  exerciseId: string;
  title: string;
  type: ExerciseType;
  lastScore: number;
  lastAttempt: Date;
};

async function getMistakes(userId: string): Promise<Row[]> {
  return prisma.$queryRaw<Row[]>`
    SELECT * FROM (
      SELECT DISTINCT ON (ue."exerciseId")
        ue."exerciseId" AS "exerciseId",
        ex."title"      AS "title",
        ex."type"       AS "type",
        ue."score"      AS "lastScore",
        ue."completedAt" AS "lastAttempt"
      FROM "UserExercise" ue
      JOIN "Exercise" ex ON ex.id = ue."exerciseId"
      WHERE ue."userId" = ${userId}
      ORDER BY ue."exerciseId", ue."completedAt" DESC
    ) latest
    WHERE latest."lastScore" < 60
    ORDER BY latest."lastAttempt" DESC
    LIMIT 100
  `;
}

export default async function MistakesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations("mistakes");
  const te = await getTranslations("exercises");
  const tt = await getTranslations("exerciseTypes");

  const mistakes = await getMistakes(session.user.id);

  const grouped = new Map<ExerciseType, Row[]>();
  for (const m of mistakes) {
    const list = grouped.get(m.type) ?? [];
    list.push(m);
    grouped.set(m.type, list);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/exercises"
        className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        ← {te("back")}
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("subtitle")}
        </p>
      </header>

      {mistakes.length === 0 ? (
        <Card className="mt-8 text-center" padding="lg">
          <p className="text-sm text-muted-foreground sm:text-base">{t("empty")}</p>
        </Card>
      ) : (
        <div className="mt-8 space-y-6">
          {[...grouped.entries()].map(([type, rows]) => (
            <Card key={type}>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold sm:text-xl">
                <span className="text-primary">
                  <ExerciseTypeIcon type={type} size={20} />
                </span>
                {tt(type)}
              </h2>
              <ul className="mt-4 divide-y divide-border">
                {rows.map((r) => (
                  <li
                    key={r.exerciseId}
                    className="flex flex-col gap-3 py-3 text-sm first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium">{r.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-mono text-danger">
                          {t("lastScore", { score: r.lastScore })}
                        </span>
                        <span className="mx-1.5">·</span>
                        {t("lastTry", {
                          date: new Date(r.lastAttempt).toLocaleDateString(locale),
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/exercises/${r.exerciseId}`}
                      className={buttonClasses("primary", "sm")}
                    >
                      {t("retry")}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
