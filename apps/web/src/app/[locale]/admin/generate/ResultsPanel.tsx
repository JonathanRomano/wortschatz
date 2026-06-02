"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { Card } from "@/components/ui/Card";
import { InlineLink } from "@/components/ui/InlineLink";
import type { GeneratedExerciseSummary, GenerationResult } from "@scripts/shared/types";

const codeSx = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "monospace",
  fontSize: "0.78rem",
  m: 0,
  p: 1.5,
  borderRadius: 1,
  backgroundColor: "surfaceAlt.main",
} as const;

function ExerciseResultCard({ ex }: { ex: GeneratedExerciseSummary }) {
  const t = useTranslations("admin.generate.results");
  const tTypes = useTranslations("exerciseTypes");
  const [showJson, setShowJson] = useState(false);

  return (
    <Card padding="sm">
      <Stack spacing={1}>
        <Typography variant="subtitle2">{ex.title}</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
          <Chip label={tTypes(ex.type)} size="small" />
          <Chip label={ex.level} size="small" />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {ex.topic}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Button size="small" variant="text" onClick={() => setShowJson((v) => !v)}>
            {showJson ? t("hideJson") : t("showJson")}
          </Button>
          {ex.id ? (
            <InlineLink href={`/exercises/${ex.id}`} tone="primary">
              {t("viewExercise")}
            </InlineLink>
          ) : null}
        </Stack>
        {showJson ? (
          <Typography component="pre" variant="body2" sx={codeSx}>
            {JSON.stringify(
              { content: ex.content, solution: ex.solution, explanation: ex.explanation, tags: ex.tags, tip: ex.tip },
              null,
              2,
            )}
          </Typography>
        ) : null}
      </Stack>
    </Card>
  );
}

export function ResultsPanel({
  result,
  loading,
  errorCode,
}: {
  result: GenerationResult | null;
  loading: boolean;
  errorCode: string | null;
}) {
  const t = useTranslations("admin.generate.results");
  const te = useTranslations("admin.generate.errors");
  const tf = useTranslations("admin.generate.form");

  if (loading) {
    return (
      <Card padding="lg">
        <Stack spacing={2} sx={{ py: 4, alignItems: "center" }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {tf("generating")}
          </Typography>
        </Stack>
      </Card>
    );
  }

  if (errorCode) {
    const msg = errorCode === "rate_limited" ? te("rate_limited") : te("generic");
    return (
      <Card padding="lg">
        <Typography sx={{ color: "error.main" }}>{msg}</Typography>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card padding="lg">
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("empty")}
        </Typography>
      </Card>
    );
  }

  const total = result.generated.length + result.failed.length;
  const seconds = Math.max(1, Math.round(result.totalDurationMs / 1000));
  const isDry = result.sessionId === "";

  return (
    <Stack spacing={2}>
      <Card padding="md">
        <Typography variant="subtitle1">
          {isDry
            ? t("summaryDry", { ok: result.generated.length, total })
            : t("summary", { ok: result.generated.length, total, seconds })}
        </Typography>
        {!isDry ? (
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {t("session", { id: result.sessionId })}
            </Typography>
            <InlineLink href={`/admin/generate/history/${result.sessionId}`} tone="primary">
              {t("viewSession")}
            </InlineLink>
          </Stack>
        ) : null}
      </Card>

      <Stack spacing={1.5}>
        {result.generated.map((ex, i) => (
          <ExerciseResultCard key={ex.id ?? `dry-${i}`} ex={ex} />
        ))}
      </Stack>

      {result.failed.length > 0 ? (
        <Accordion disableGutters sx={{ boxShadow: "none", border: 1, borderColor: "divider" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ color: "error.main" }}>
              {t("failuresTitle", { count: result.failed.length })}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1} component="ul" sx={{ m: 0, pl: 2 }}>
              {result.failed.map((f) => (
                <Typography key={f.index} component="li" variant="body2" sx={{ color: "text.secondary" }}>
                  #{f.index + 1} · {f.topic} — {f.reason} ({f.code})
                </Typography>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ) : null}
    </Stack>
  );
}
