import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";
import { MUENZEN_RULES } from "@/lib/muenzen";
import { Card } from "@/components/ui/Card";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { ReviewForm } from "./ReviewForm";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/login`);

  const t = await getTranslations("review");

  const [user, history] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { muenzen: true },
    }),
    prisma.aIReviewRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 5 } }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }}>
            {t("title")}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1.5, color: "text.secondary" }}>
            {t("subtitle", { cost: MUENZEN_RULES.aiReviewCost })}
          </Typography>
        </Box>
        <MuenzenBadge amount={user.muenzen} size="lg" />
      </Stack>

      <Card padding="lg" sx={{ mt: 3 }}>
        <ReviewForm balance={user.muenzen} cost={MUENZEN_RULES.aiReviewCost} />
      </Card>

      <Box component="section" sx={{ mt: 5 }}>
        <Typography variant="h4">{t("history")}</Typography>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {history.length === 0 ? (
            <Card sx={{ textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>—</Typography>
            </Card>
          ) : (
            history.map((r) => (
              <Card key={r.id}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", flexWrap: "wrap", color: "text.secondary" }}
                >
                  <Typography variant="caption">
                    {r.createdAt.toLocaleString()}
                  </Typography>
                  <Typography variant="caption">·</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                    }}
                  >
                    -{r.muenzenCost} M
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 1,
                    fontStyle: "italic",
                    color: "text.secondary",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "break-word",
                  }}
                >
                  {r.inputText}
                </Typography>
                <Accordion
                  disableGutters
                  elevation={0}
                  square
                  sx={{
                    mt: 1.5,
                    "&:before": { display: "none" },
                    backgroundColor: "transparent",
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      px: 0,
                      minHeight: 36,
                      color: "primary.main",
                      "& .MuiAccordionSummary-content": { my: 0.5 },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {t("feedbackHeading")}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0 }}>
                    <Box
                      component="pre"
                      sx={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        borderRadius: 1,
                        backgroundColor: "surfaceAlt.main",
                        color: "text.primary",
                        p: 1.5,
                        m: 0,
                        fontFamily: "inherit",
                        fontSize: "0.875rem",
                        lineHeight: 1.55,
                      }}
                    >
                      {r.feedback}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Card>
            ))
          )}
        </Stack>
      </Box>
    </Container>
  );
}
