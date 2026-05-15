import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MUENZEN_RULES } from "@/lib/muenzen";
import { Card } from "@/components/ui/Card";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { ReviewForm } from "./ReviewForm";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations("review");

  const [user, history] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { muenzen: true },
    }),
    prisma.aIReviewRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("subtitle", { cost: MUENZEN_RULES.aiReviewCost })}
          </p>
        </div>
        <MuenzenBadge amount={user.muenzen} size="lg" />
      </header>

      <Card className="mt-6" padding="lg">
        <ReviewForm balance={user.muenzen} cost={MUENZEN_RULES.aiReviewCost} />
      </Card>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold sm:text-2xl">
          {t("history")}
        </h2>
        <ul className="mt-4 space-y-3">
          {history.length === 0 ? (
            <Card className="text-center" padding="md">
              <p className="text-sm text-muted-foreground">—</p>
            </Card>
          ) : (
            history.map((r) => (
              <Card key={r.id} padding="md">
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{r.createdAt.toLocaleString()}</span>
                  <span>·</span>
                  <span className="font-mono">-{r.muenzenCost} M</span>
                </p>
                <p className="mt-2 line-clamp-2 break-words text-sm italic text-muted-foreground">
                  {r.inputText}
                </p>
                <details className="mt-3 text-sm">
                  <summary className="inline-flex min-h-9 cursor-pointer items-center font-medium text-primary hover:underline">
                    {t("feedbackHeading")}
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap break-words rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                    {r.feedback}
                  </pre>
                </details>
              </Card>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
