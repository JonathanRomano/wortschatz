"use client";

import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsRounded";

import { pickLocalized } from "@wortschatz/config";
import type { Locale } from "@/i18n/config";
import type { Achievement } from "@/content/achievements";

type Props = {
  items: Achievement[];
  locale: Locale;
  earnedCount: number;
};

/**
 * Read-only achievements shelf. Earned badges are highlighted; locked ones are
 * dimmed. All badge copy is LocalizedText (see content/achievements.ts); only
 * the section chrome goes through next-intl.
 */
export function AchievementsShelf({ items, locale, earnedCount }: Props) {
  const t = useTranslations("dashboard.achievements");

  return (
    <Box component="section" sx={{ mt: { xs: 3, sm: 4 } }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap" }}
      >
        <Typography variant="h2" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
          {t("title")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("earnedOf", { earned: earnedCount, total: items.length })}
        </Typography>
      </Stack>

      <Box
        sx={{
          mt: 2,
          display: "grid",
          gap: { xs: 1.5, sm: 2 },
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
          },
        }}
      >
        {items.map((a) => (
          <Box
            key={a.id}
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 3,
              border: 1,
              borderStyle: "solid",
              borderColor: a.earned ? "success.main" : "divider",
              backgroundColor: a.earned ? "successSoft.main" : "surfaceAlt.main",
              opacity: a.earned ? 1 : 0.55,
              textAlign: "center",
            }}
          >
            <EmojiEventsIcon
              sx={{
                fontSize: 30,
                color: a.earned ? "success.main" : "text.disabled",
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
              {pickLocalized(a.title, locale)}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: "block", color: "text.secondary", mt: 0.25 }}
            >
              {pickLocalized(a.description, locale)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
