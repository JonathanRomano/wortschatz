import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { auth } from "@/auth";
import { Card } from "@/components/ui/Card";

import { AdminSubNav } from "../AdminSubNav";
import { PromptsClient } from "./PromptsClient";

export default async function PromptsPage({
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

  const t = await getTranslations("admin.prompts");

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
        <AdminSubNav current="prompts" />
      </Stack>

      <Box sx={{ mt: 4 }}>
        <PromptsClient />
      </Box>
    </Container>
  );
}
