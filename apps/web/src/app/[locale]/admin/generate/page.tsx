import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { auth } from "@/auth";
import { Card } from "@/components/ui/Card";
import { TOPICS_BY_LEVEL } from "@scripts/shared/topics";

import { AdminSubNav } from "../AdminSubNav";
import { GenerateClient } from "./GenerateClient";

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const tAdmin = await getTranslations("admin");
  if (session.user.role !== "ADMIN") {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Card padding="lg" sx={{ textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            {tAdmin("noPermission")}
          </Typography>
        </Card>
      </Container>
    );
  }

  const t = await getTranslations("admin.generate");
  const topicsByLevel = {
    A1: TOPICS_BY_LEVEL.A1,
    A2: TOPICS_BY_LEVEL.A2,
    B1: TOPICS_BY_LEVEL.B1,
    B2: TOPICS_BY_LEVEL.B2,
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 5 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 2 }}
      >
        <Box>
          <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }}>
            {t("title")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {t("subtitle")}
          </Typography>
        </Box>
        <AdminSubNav current="generate" />
      </Stack>

      <Box sx={{ mt: 4 }}>
        <GenerateClient topicsByLevel={topicsByLevel} />
      </Box>
    </Container>
  );
}
