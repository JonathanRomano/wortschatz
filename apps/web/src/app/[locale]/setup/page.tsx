import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";
import { Card } from "@/components/ui/Card";
import { CAREER_TRACKS } from "@/lib/track/flags";
import { SetupFlow } from "./SetupFlow";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  if (!CAREER_TRACKS) redirect(`/${locale}/dashboard`);
  const t = await getTranslations("setup");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { profession: true, learningLevel: true, dailyGoal: true },
  });
  // Already set up — nothing to do here.
  if (user.profession) redirect(`/${locale}/dashboard`);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 }, px: { xs: 2, sm: 3 } }}>
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: "1.75rem", sm: "2.25rem" },
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {t("title")}
      </Typography>
      <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
        {t("subtitle")}
      </Typography>
      <Card padding="lg" sx={{ mt: 3 }}>
        <SetupFlow
          initialLevel={user.learningLevel ?? ""}
          initialDailyGoal={user.dailyGoal}
        />
      </Card>
    </Container>
  );
}
