import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const t = await getTranslations("profile");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      preferredLanguage: true,
      bio: true,
      nativeLanguage: true,
      learningLevel: true,
      dailyGoal: true,
      avatarUrl: true,
      muenzen: true,
      streak: true,
    },
  });

  // Stats card — these run server-side so the numbers are always
  // fresh after a save. Total exercises is the count of all attempts
  // (matches the dashboard's "exercises completed" metric).
  const totalExercises = await prisma.userExercise.count({
    where: { userId: session.user.id },
  });

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 5 }, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }}>
        {t("title")}
      </Typography>

      <Card padding="lg" sx={{ mt: 3 }}>
        <ProfileForm
          name={user.name ?? ""}
          email={user.email}
          preferredLanguage={user.preferredLanguage}
          bio={user.bio ?? ""}
          nativeLanguage={user.nativeLanguage ?? ""}
          learningLevel={user.learningLevel ?? ""}
          dailyGoal={user.dailyGoal}
          avatarUrl={user.avatarUrl}
        />
      </Card>

      <Card padding="lg" sx={{ mt: 3 }}>
        <Typography variant="h4">{t("stats.title")}</Typography>
        <Box
          sx={{
            mt: 2,
            display: "grid",
            gap: { xs: 1.5, sm: 2 },
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          }}
        >
          <StatCell
            label={t("stats.totalExercises")}
            value={String(totalExercises)}
          />
          <StatCell
            label={t("stats.currentStreak")}
            value=""
            icon={<StreakFlame days={user.streak} size="md" />}
          />
          <StatCell
            label={t("stats.totalMuenzen")}
            value=""
            icon={<MuenzenBadge amount={user.muenzen} size="md" />}
          />
        </Box>
      </Card>

      <Stack sx={{ mt: 3, alignItems: { xs: "stretch", sm: "flex-start" } }}>
        <ButtonLink
          href="/profile/historico"
          variant="outlined"
          color="primary"
          sx={{ width: { xs: "100%", sm: "auto" }, minHeight: 44 }}
        >
          {t("historyLink")}
        </ButtonLink>
      </Stack>
    </Container>
  );
}

function StatCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="overline"
        sx={{ color: "text.secondary", display: "block" }}
      >
        {label}
      </Typography>
      {icon ? (
        <Box sx={{ mt: 0.25 }}>{icon}</Box>
      ) : (
        <Typography
          variant="h3"
          sx={{ fontSize: { xs: "1.5rem", sm: "1.875rem" } }}
        >
          {value}
        </Typography>
      )}
    </Stack>
  );
}
