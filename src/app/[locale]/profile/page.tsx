import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
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
    select: { name: true, email: true, preferredLanguage: true },
  });

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 5 } }}>
      <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }}>
        {t("title")}
      </Typography>
      <Card padding="lg" sx={{ mt: 3 }}>
        <ProfileForm
          name={user.name ?? ""}
          email={user.email}
          preferredLanguage={user.preferredLanguage}
        />
      </Card>
    </Container>
  );
}
