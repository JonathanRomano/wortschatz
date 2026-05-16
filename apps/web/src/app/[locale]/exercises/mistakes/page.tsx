import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ExerciseType } from "@wortschatz/database";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { InlineLink } from "@/components/ui/InlineLink";

type Row = {
  exerciseId: string;
  title: string;
  type: ExerciseType;
  lastScore: number;
  lastAttempt: Date;
};

async function getMistakes(userId: string): Promise<Row[]> {
  return prisma.$queryRaw<Row[]>`
    SELECT * FROM (
      SELECT DISTINCT ON (ue."exerciseId")
        ue."exerciseId" AS "exerciseId",
        ex."title"      AS "title",
        ex."type"       AS "type",
        ue."score"      AS "lastScore",
        ue."completedAt" AS "lastAttempt"
      FROM "UserExercise" ue
      JOIN "Exercise" ex ON ex.id = ue."exerciseId"
      WHERE ue."userId" = ${userId}
      ORDER BY ue."exerciseId", ue."completedAt" DESC
    ) latest
    WHERE latest."lastScore" < 60
    ORDER BY latest."lastAttempt" DESC
    LIMIT 100
  `;
}

export default async function MistakesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations("mistakes");
  const te = await getTranslations("exercises");
  const tt = await getTranslations("exerciseTypes");

  const mistakes = await getMistakes(session.user.id);

  const grouped = new Map<ExerciseType, Row[]>();
  for (const m of mistakes) {
    const list = grouped.get(m.type) ?? [];
    list.push(m);
    grouped.set(m.type, list);
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 5 } }}>
      <InlineLink
        href="/exercises"
        tone="muted"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          minHeight: 36,
        }}
      >
        <ArrowBackIcon fontSize="small" />
        <Typography component="span" variant="body2">
          {te("back")}
        </Typography>
      </InlineLink>

      <Box component="header" sx={{ mt: 2 }}>
        <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }}>
          {t("title")}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1.5, color: "text.secondary" }}>
          {t("subtitle")}
        </Typography>
      </Box>

      {mistakes.length === 0 ? (
        <Card padding="lg" sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("empty")}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={3} sx={{ mt: 4 }}>
          {[...grouped.entries()].map(([type, rows]) => (
            <Card key={type}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center" }}
              >
                <Box sx={{ color: "primary.main", display: "flex" }}>
                  <ExerciseTypeIcon type={type} size={20} color="inherit" />
                </Box>
                <Typography variant="h5" component="h2">
                  {tt(type)}
                </Typography>
              </Stack>
              <Stack
                divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
                sx={{ mt: 2 }}
              >
                {rows.map((r) => (
                  <Stack
                    key={r.exerciseId}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{
                      py: 1.5,
                      alignItems: { xs: "stretch", sm: "center" },
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: "break-word" }}>
                        {r.title}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ mt: 0.5, color: "text.secondary", alignItems: "center" }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily:
                              'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                            color: "error.main",
                          }}
                        >
                          {t("lastScore", { score: r.lastScore })}
                        </Typography>
                        <Typography variant="caption">·</Typography>
                        <Typography variant="caption">
                          {t("lastTry", {
                            date: new Date(r.lastAttempt).toLocaleDateString(locale),
                          })}
                        </Typography>
                      </Stack>
                    </Box>
                    <ButtonLink
                      href={`/exercises/${r.exerciseId}`}
                      variant="contained"
                      color="primary"
                      size="small"
                    >
                      {t("retry")}
                    </ButtonLink>
                  </Stack>
                ))}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
