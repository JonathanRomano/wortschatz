import type { ExerciseType } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";

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

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tt = await getTranslations("exerciseTypes");

  const proofText =
    locale === "pt"
      ? "Dez tipos de exercício, cada um afina uma habilidade diferente."
      : locale === "tr"
        ? "On alıştırma türü — her biri farklı bir beceriyi geliştirir."
        : locale === "uk"
          ? "Десять типів вправ — кожен тренує свою навичку."
          : "Ten exercise types, each tuning a different skill.";

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, sm: 8, lg: 12 } }}>
      {/* Hero */}
      <Box
        component="section"
        sx={{
          display: "grid",
          alignItems: "center",
          gap: { xs: 6, lg: 8 },
          gridTemplateColumns: { xs: "1fr", lg: "1.2fr 1fr" },
        }}
      >
        <Box>
          <Chip
            icon={
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  height: 6,
                  width: 6,
                  borderRadius: "50%",
                  backgroundColor: "secondary.main",
                  display: "inline-block",
                }}
              />
            }
            label="Wortschatz · A1 — C2"
            variant="outlined"
            size="small"
            sx={{
              borderColor: "divider",
              backgroundColor: "background.paper",
              color: "text.secondary",
              fontFamily:
                'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: "0.75rem",
              borderRadius: 9999,
              "& .MuiChip-icon": { ml: 1, mr: -0.5 },
            }}
          />
          <Typography
            variant="h1"
            sx={{
              mt: 2.5,
              textWrap: "balance",
              fontSize: { xs: "2.25rem", sm: "3rem", lg: "3.5rem" },
              lineHeight: 1.05,
              color: "text.primary",
            }}
          >
            {t("landing.heroTitle")}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 3,
              maxWidth: 540,
              fontSize: { xs: "1rem", sm: "1.125rem" },
              color: "text.secondary",
              textWrap: "pretty",
            }}
          >
            {t("landing.heroBody")}
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ mt: 4, alignItems: { xs: "stretch", sm: "center" } }}
          >
            <ButtonLink
              href="/register"
              variant="contained"
              color="primary"
              size="large"
            >
              {t("landing.ctaPrimary")}
            </ButtonLink>
            <ButtonLink
              href="/login"
              variant="outlined"
              size="large"
            >
              {t("landing.ctaSecondary")}
            </ButtonLink>
          </Stack>
        </Box>

        {/* Visual side: a stylized exercise card peek */}
        <Box sx={{ position: "relative" }}>
          <Card padding="lg" sx={{ position: "relative", overflow: "hidden" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                  color: "text.secondary",
                }}
              >
                A2 · {tt("FILL_IN_THE_BLANK")}
              </Typography>
              <MuenzenBadge amount={10} size="sm" />
            </Box>
            <Typography
              variant="h3"
              component="p"
              sx={{
                mt: 2.5,
                fontSize: { xs: "1.5rem", sm: "1.875rem" },
                lineHeight: 1.3,
              }}
            >
              Ich{" "}
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  minWidth: 96,
                  borderBottom: 2,
                  borderColor: "secondary.main",
                  borderStyle: "solid",
                  pb: 0.25,
                  textAlign: "center",
                  verticalAlign: "baseline",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "1.25rem",
                  color: "text.primary",
                }}
              >
                esse
              </Box>{" "}
              einen Apfel.
            </Typography>
            <Typography
              variant="body2"
              sx={{ mt: 2, color: "text.secondary" }}
            >
              Hint · Verb &laquo;essen&raquo;
            </Typography>
            <Box
              sx={{
                mt: 3,
                pt: 2,
                borderTop: 1,
                borderColor: "divider",
                borderStyle: "solid",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                +10 M when you nail it
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                  color: "text.secondary",
                }}
              >
                01 / 50
              </Typography>
            </Box>
          </Card>
          {/* Soft glow behind the card */}
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              inset: -24,
              zIndex: -1,
              borderRadius: 6,
              backgroundColor: "accentSoft.main",
              opacity: 0.4,
              filter: "blur(40px)",
            }}
          />
        </Box>
      </Box>

      {/* Features */}
      <Box
        component="section"
        sx={{
          mt: { xs: 10, lg: 14 },
          display: "grid",
          gap: { xs: 2.5, sm: 3 },
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
        }}
      >
        {[
          { title: t("landing.feature1Title"), body: t("landing.feature1Body") },
          { title: t("landing.feature2Title"), body: t("landing.feature2Body") },
          { title: t("landing.feature3Title"), body: t("landing.feature3Body") },
        ].map((f, i) => (
          <Card key={f.title} sx={{ display: "flex", flexDirection: "column" }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 36,
                width: 36,
                borderRadius: "50%",
                backgroundColor: "accentSoft.main",
                color: "secondary.main",
              }}
            >
              <FeatureGlyph index={i} />
            </Box>
            <Typography variant="h4" sx={{ mt: 2 }}>
              {f.title}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 1,
                color: "text.secondary",
                fontSize: { xs: "0.875rem", sm: "1rem" },
                lineHeight: 1.6,
              }}
            >
              {f.body}
            </Typography>
          </Card>
        ))}
      </Box>

      {/* Exercise types proof strip */}
      <Box component="section" sx={{ mt: { xs: 8, sm: 10 } }}>
        <Typography
          align="center"
          variant="body1"
          sx={{ color: "text.secondary", fontSize: { xs: "0.875rem", sm: "1rem" } }}
        >
          {proofText}
        </Typography>
        <Box
          component="ul"
          sx={{
            mt: 3,
            p: 0,
            listStyle: "none",
            display: "grid",
            gap: { xs: 1.5, sm: 2 },
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(5, 1fr)",
            },
          }}
        >
          {TYPES.map((tp) => (
            <Box
              component="li"
              key={tp}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
                p: 2,
                borderRadius: 3,
                border: 1,
                borderStyle: "solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                textAlign: "center",
              }}
            >
              <ExerciseTypeIcon type={tp} size={28} color="primary" />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 500,
                  color: "text.primary",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
              >
                {tt(tp)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
}

function FeatureGlyph({ index }: { index: number }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (index) {
    case 0:
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M5 8c2-2 5-2 7 0s5 2 7 0" />
          <path d="M5 16c2-2 5-2 7 0s5 2 7 0" />
        </svg>
      );
    case 1:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fontFamily="ui-serif, Georgia, serif"
            fill="currentColor"
            stroke="none"
          >
            M
          </text>
        </svg>
      );
    case 2:
    default:
      return (
        <svg {...common}>
          <path d="M5 6h14" />
          <path d="M5 12h14" />
          <path d="M5 18h9" />
          <circle cx="19" cy="18" r="2.5" />
        </svg>
      );
  }
}
