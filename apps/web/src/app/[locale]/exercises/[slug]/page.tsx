import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";
import type { Locale } from "@/i18n/config";
import { pickLocalized } from "@wortschatz/config";
import { getRandomExerciseOfType } from "@/lib/exercises/actions";
import { getSkipIntro } from "@/lib/preferences/actions";
import { Card } from "@/components/ui/Card";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { InlineLink } from "@/components/ui/InlineLink";
import { LevelChip } from "@/components/ui/LevelChip";
import { LevelFilter } from "./LevelFilter";
import { TypeRunner, type LoadedExercise } from "./TypeRunner";
import { ExerciseRunner } from "./ExerciseRunner";
import { ExerciseHelpButton } from "./ExerciseHelpButton";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { DEFAULT_PAGE_SIZE, loadComments } from "@/lib/comments/queries";

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

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function asType(slug: string): ExerciseType | null {
  return TYPES.includes(slug as ExerciseType) ? (slug as ExerciseType) : null;
}

function asLevel(raw: string | string[] | undefined): CefrLevel | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return undefined;
  const upper = v.toUpperCase();
  return LEVELS.includes(upper as CefrLevel) ? (upper as CefrLevel) : undefined;
}

async function loadExercise(
  id: string,
  locale: Locale,
  userId: string,
): Promise<LoadedExercise | null> {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      instructions: true,
      explanation: true,
      type: true,
      level: true,
      content: true,
      status: true,
    },
  });
  if (!exercise || exercise.status !== "PUBLISHED") return null;

  const priorSuccess = await prisma.userExercise.findFirst({
    where: { userId, exerciseId: id, score: { gte: 60 } },
    select: { id: true },
  });

  return {
    id: exercise.id,
    type: exercise.type,
    level: exercise.level,
    title: exercise.title,
    instructions: pickLocalized(exercise.instructions, locale),
    explanation: pickLocalized(exercise.explanation, locale),
    content: exercise.content as Record<string, unknown>,
    alreadyEarned: Boolean(priorSuccess),
  };
}

export default async function ExerciseSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations("exercises");
  const tt = await getTranslations("exerciseTypes");
  const td = await getTranslations("exerciseTypeDescriptions");
  const tf = await getTranslations("filters");

  const type = asType(slug);
  const level = asLevel(sp.level);

  // Type page: random exercise + Next button.
  if (type) {
    const [picked, skipIntro] = await Promise.all([
      getRandomExerciseOfType(type, undefined, level),
      getSkipIntro(session.user.id, type),
    ]);
    const initial = picked
      ? await loadExercise(picked.id, locale as Locale, session.user.id)
      : null;

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
            {t("back")}
          </Typography>
        </InlineLink>

        <Stack
          component="header"
          direction="row"
          spacing={2}
          sx={{ mt: 2, alignItems: "flex-start" }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: { xs: 48, sm: 56 },
              width: { xs: 48, sm: 56 },
              flexShrink: 0,
              borderRadius: "50%",
              backgroundColor: "accentSoft.main",
              color: "primary.main",
            }}
          >
            <ExerciseTypeIcon type={type} size={26} color="inherit" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }}>
              {tt(type)}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
              {td(type)}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 3 }}>
          <LevelFilter
            type={type}
            current={level}
            labels={{ level: tf("level"), all: tf("all") }}
            levels={LEVELS}
          />
        </Box>

        {initial ? (
          <TypeRunner
            type={type}
            level={level}
            initialExercise={initial}
            initialSkipIntro={skipIntro}
          />
        ) : (
          <Card padding="lg" sx={{ mt: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("noExercises")}
            </Typography>
            {level ? (
              <InlineLink
                href={`/exercises/${type}`}
                sx={{ mt: 2, display: "inline-block" }}
              >
                {tf("clearLevel")}
              </InlineLink>
            ) : null}
          </Card>
        )}
      </Container>
    );
  }

  // Detail page: render a specific exercise by id (e.g. "Retry" from
  // the mistakes list).
  const detail = await loadExercise(slug, locale as Locale, session.user.id);
  if (!detail) notFound();
  const [skipIntroDetail, initialComments] = await Promise.all([
    getSkipIntro(session.user.id, detail.type),
    loadComments({
      exerciseId: detail.id,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      viewerId: session.user.id,
    }),
  ]);

  // 800px focus column: wide enough for two-column matching exercises,
  // narrow enough that the question is the only thing on the page.
  return (
    <Container
      sx={{
        py: { xs: 4, sm: 5 },
        maxWidth: { xs: "100%", sm: 800 },
      }}
    >
      <InlineLink
        href={`/exercises/${detail.type}`}
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
          {t("back")}
        </Typography>
      </InlineLink>

      <Box component="header" sx={{ mt: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <LevelChip level={detail.level} />
            <Typography
              variant="overline"
              sx={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                color: "text.secondary",
              }}
            >
              {tt(detail.type)}
            </Typography>
          </Stack>
          <ExerciseHelpButton type={detail.type} initialSkip={skipIntroDetail} />
        </Stack>
        <Typography
          variant="h2"
          sx={{
            mt: 1.5,
            fontSize: { xs: "1.75rem", sm: "2.125rem" },
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
          }}
        >
          {detail.title}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            mt: 1.5,
            color: "text.secondary",
            fontSize: { xs: "1rem", sm: "1.0625rem" },
            lineHeight: 1.6,
          }}
        >
          {detail.instructions}
        </Typography>
      </Box>

      <Card padding="lg" sx={{ mt: 4 }}>
        <ExerciseRunner
          exerciseId={detail.id}
          type={detail.type}
          content={detail.content}
          explanation={detail.explanation}
          alreadyEarned={detail.alreadyEarned}
        />
      </Card>

      <Box sx={{ mt: 4 }}>
        <CommentsSection
          exerciseId={detail.id}
          isAuthed={Boolean(session.user?.id)}
          initial={initialComments}
        />
      </Box>
    </Container>
  );
}
