import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

import { Card } from "@/components/ui/Card";
import { InlineLink } from "@/components/ui/InlineLink";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
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
        {t("loginTitle")}
      </Typography>
      <Card padding="lg" sx={{ mt: 3 }}>
        <LoginForm />
      </Card>
      <Typography
        variant="body2"
        align="center"
        sx={{ mt: 3, color: "text.secondary" }}
      >
        {t("noAccount")}{" "}
        <InlineLink href="/register">{t("submitRegister")}</InlineLink>
      </Typography>
    </Container>
  );
}
