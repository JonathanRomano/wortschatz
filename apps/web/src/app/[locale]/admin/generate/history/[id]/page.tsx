import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";

import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { InlineLink } from "@/components/ui/InlineLink";

type SessionFailure = { index: number; topic: string; reason: string; code: string };

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
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

  const row = await prisma.generationSession.findUnique({
    where: { id },
    include: {
      savedPrompt: { select: { name: true } },
      exercises: {
        select: { id: true, title: true, type: true, level: true, status: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row || row.authorId !== session.user.id) notFound();

  const t = await getTranslations("admin.history");
  const td = await getTranslations("admin.history.detail");
  const tc = await getTranslations("admin.history.columns");
  const tTypes = await getTranslations("exerciseTypes");

  const failures = (row.failures as SessionFailure[] | null) ?? [];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 5 } }}>
      <Box sx={{ mb: 2 }}>
        <ButtonLink href="/admin/generate/history" variant="text" size="small" sx={{ minHeight: 44 }}>
          ‹ {td("back")}
        </ButtonLink>
      </Box>

      <Typography variant="h1" sx={{ fontSize: { xs: "1.75rem", sm: "2.25rem" } }}>
        {td("title")}
      </Typography>

      <Card padding="md" sx={{ mt: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
          <Chip label={tTypes(row.type)} size="small" />
          <Chip label={row.level} size="small" />
          <Chip label={row.source} size="small" />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {new Date(row.createdAt).toLocaleString()}
          </Typography>
        </Stack>
        <Stack spacing={0.5} sx={{ mt: 1.5 }}>
          <Typography variant="body2">
            {tc("topic")}: {row.topic ?? t("topicAuto")}
          </Typography>
          <Typography variant="body2">
            {tc("prompt")}: {row.savedPrompt?.name ?? t("adhoc")}
          </Typography>
          <Typography variant="body2">
            {tc("result")}: {row.successCount}/{row.requestedCount}
            {row.failureCount > 0 ? ` (−${row.failureCount})` : ""}
            {row.durationMs != null ? ` · ${Math.round(row.durationMs / 1000)}s` : ""}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {row.provider} · {row.modelUsed}
          </Typography>
        </Stack>
      </Card>

      <Box component="section" sx={{ mt: 4 }}>
        <Typography variant="h4">{td("exercises")}</Typography>
        {row.exercises.length === 0 ? (
          <Card padding="lg" sx={{ mt: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {td("noExercises")}
            </Typography>
          </Card>
        ) : (
          <Card padding="sm" sx={{ mt: 1.5 }}>
            <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
              {row.exercises.map((ex) => (
                <Stack
                  key={ex.id}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ py: 1.25, justifyContent: "space-between", alignItems: { sm: "center" } }}
                >
                  <Box>
                    <Typography variant="body2">{ex.title}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, alignItems: "center" }}>
                      <Chip label={tTypes(ex.type)} size="small" />
                      <Chip label={ex.level} size="small" />
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {ex.status}
                      </Typography>
                    </Stack>
                  </Box>
                  <InlineLink href={`/exercises/${ex.id}`} tone="primary">
                    {t("view")}
                  </InlineLink>
                </Stack>
              ))}
            </Stack>
          </Card>
        )}
      </Box>

      {failures.length > 0 ? (
        <Box component="section" sx={{ mt: 4 }}>
          <Typography variant="h4">{td("failures")}</Typography>
          <Card padding="md" sx={{ mt: 1.5 }}>
            <Stack spacing={1} component="ul" sx={{ m: 0, pl: 2 }}>
              {failures.map((f) => (
                <Typography key={f.index} component="li" variant="body2" sx={{ color: "text.secondary" }}>
                  #{f.index + 1} · {f.topic} — {f.reason} ({f.code})
                </Typography>
              ))}
            </Stack>
          </Card>
        </Box>
      ) : null}
    </Container>
  );
}
