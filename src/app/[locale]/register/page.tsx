import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

import { Card } from "@/components/ui/Card";
import { InlineLink } from "@/components/ui/InlineLink";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, sm: 8 } }}>
      <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }}>
        {t("registerTitle")}
      </Typography>
      <Card padding="lg" sx={{ mt: 3 }}>
        <RegisterForm />
      </Card>
      <Typography
        variant="body2"
        align="center"
        sx={{ mt: 3, color: "text.secondary" }}
      >
        {t("haveAccount")}{" "}
        <InlineLink href="/login">{t("submitLogin")}</InlineLink>
      </Typography>
    </Container>
  );
}
