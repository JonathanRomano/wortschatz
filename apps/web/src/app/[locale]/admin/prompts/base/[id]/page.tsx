import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

import { auth } from "@/auth";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";

import { BasePromptEditClient } from "./BasePromptEditClient";

/**
 * /admin/prompts/base/[id] — edit one base prompt: scoped editor, test panel,
 * version history. ADMIN or TEACHER; the client receives `role` so the
 * ADMIN-only Revert action can be hidden for teachers.
 */
export default async function BasePromptEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const tAdmin = await getTranslations("admin");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
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

  const t = await getTranslations("admin.basePrompts");

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 5 } }}>
      <ButtonLink href="/admin/prompts/base" variant="text" size="small" sx={{ mb: 2 }}>
        ‹ {t("back")}
      </ButtonLink>
      <BasePromptEditClient id={id} role={role} />
    </Container>
  );
}
