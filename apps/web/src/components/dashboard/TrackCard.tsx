"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import { useTranslations } from "next-intl";
import type { ProfessionSlug } from "@wortschatz/config";

import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProfessionChip } from "@/components/ui/ProfessionChip";

type Props = {
  profession: ProfessionSlug;
  percent: number;
  /** Checked-off vs total items in today's plan. */
  doneToday: number;
  planTotal: number;
};

/**
 * Compact "Dein Weg" teaser on the dashboard (Sprint 05) — profession,
 * overall track progress, and the continue CTA. Rendered only when the
 * user has a career track; data comes from the dashboard's parallel
 * fetch batch, not its own query.
 */
export function TrackCard({ profession, percent, doneToday, planTotal }: Props) {
  const t = useTranslations("track");

  return (
    <Card padding="md" component="section" accent>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0, width: { xs: "100%", sm: "auto" } }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Typography variant="h4" sx={{ fontSize: "1.125rem" }}>
              {t("title")}
            </Typography>
            <ProfessionChip slug={profession} size="sm" />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={percent}
            aria-label={t("progressLabel", { percent })}
            sx={{ mt: 1.5, height: 8, borderRadius: 9999 }}
          />
          <Typography
            variant="caption"
            sx={{ mt: 0.75, display: "block", color: "text.secondary" }}
          >
            {t("progressLabel", { percent })}
            {planTotal > 0 ? ` · ${doneToday}/${planTotal}` : ""}
          </Typography>
        </Box>
        <ButtonLink
          href="/track"
          variant="contained"
          color="primary"
          sx={{ minHeight: 44, flexShrink: 0, width: { xs: "100%", sm: "auto" } }}
        >
          {t("continue")}
        </ButtonLink>
      </Stack>
    </Card>
  );
}
