import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ExerciseType } from "@wortschatz/database";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";

import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";

const TYPES: ExerciseType[] = [
  "FILL_IN_THE_BLANK",
  "MULTIPLE_CHOICE",
  "TRANSLATION",
  "WORD_ORDER",
  "MATCHING",
  "LISTENING_COMPREHENSION",
  "READING_COMPREHENSION",
  "VERB_CONJUGATION",
  "ERROR_CORRECTION",
  "FREE_WRITING",
];

export default async function ExercisesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);
  const userId = session.user.id;

  const t = await getTranslations("exercises");
  const tt = await getTranslations("exerciseTypes");
  const td = await getTranslations("exerciseTypeDescriptions");

  const [publishedByType, attemptsByType] = await Promise.all([
    prisma.exercise.groupBy({
      by: ["type"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
    }),
    prisma.userExercise.findMany({
      where: { userId },
      select: { score: true, exercise: { select: { type: true } } },
    }),
  ]);

  const counts: Record<ExerciseType, number> = Object.fromEntries(
    TYPES.map((tp) => [tp, 0]),
  ) as Record<ExerciseType, number>;
  for (const row of publishedByType) counts[row.type] = row._count._all;

  const userByType: Record<ExerciseType, { total: number; correct: number }> =
    Object.fromEntries(
      TYPES.map((tp) => [tp, { total: 0, correct: 0 }]),
    ) as Record<ExerciseType, { total: number; correct: number }>;
  for (const a of attemptsByType) {
    const stat = userByType[a.exercise.type];
    stat.total += 1;
    if (a.score >= 60) stat.correct += 1;
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 5 } }}>
      <Box component="header">
        <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }}>
          {t("browseTitle")}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1.5, color: "text.secondary" }}>
          {t("browseSubtitle")}
        </Typography>
      </Box>

      <Box
        component="ul"
        sx={{
          mt: 4,
          p: 0,
          listStyle: "none",
          display: "grid",
          gap: { xs: 2, sm: 2.5 },
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
        }}
      >
        {TYPES.map((tp) => {
          const stats = userByType[tp];
          const accuracy =
            stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
          const available = counts[tp];
          const disabled = available === 0;
          return (
            <Box component="li" key={tp}>
              <Card sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
                >
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 40,
                      width: 40,
                      flexShrink: 0,
                      borderRadius: "50%",
                      backgroundColor: "accentSoft.main",
                      color: "primary.main",
                    }}
                  >
                    <ExerciseTypeIcon type={tp} size={22} color="inherit" />
                  </Box>
                  <Typography
                    variant="overline"
                    sx={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                      color: "text.secondary",
                    }}
                  >
                    {t("available", { count: available })}
                  </Typography>
                </Stack>
                <Typography variant="h4" sx={{ mt: 2 }}>
                  {tt(tp)}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ mt: 0.75, flex: 1, color: "text.secondary", lineHeight: 1.6 }}
                >
                  {td(tp)}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 2, alignItems: "center", color: "text.secondary" }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                    }}
                  >
                    {stats.total}
                  </Typography>
                  <Typography variant="caption">·</Typography>
                  <AccuracyMeter value={accuracy} attempts={stats.total} />
                </Stack>

                <ButtonLink
                  href={`/exercises/${tp}`}
                  aria-disabled={disabled}
                  variant={disabled ? "outlined" : "contained"}
                  color="primary"
                  fullWidth
                  sx={{
                    mt: 2.5,
                    ...(disabled
                      ? {
                          pointerEvents: "none",
                          cursor: "not-allowed",
                          opacity: 0.6,
                        }
                      : {}),
                  }}
                >
                  {t("practice")}
                </ButtonLink>
              </Card>
            </Box>
          );
        })}
      </Box>
    </Container>
  );
}

function AccuracyMeter({ value, attempts }: { value: number; attempts: number }) {
  if (attempts === 0) {
    return <Typography variant="caption" sx={{ color: "text.secondary" }}>—</Typography>;
  }
  const toneColor =
    value >= 80
      ? "success.main"
      : value >= 60
        ? "secondary.main"
        : "error.main";
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          width: 64,
          height: 6,
          borderRadius: 9999,
          backgroundColor: "surfaceAlt.main",
          "& .MuiLinearProgress-bar": {
            backgroundColor: toneColor,
            borderRadius: 9999,
          },
        }}
      />
      <Typography
        variant="caption"
        sx={{
          fontFamily:
            'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
          color: toneColor,
        }}
      >
        {value}%
      </Typography>
    </Stack>
  );
}
