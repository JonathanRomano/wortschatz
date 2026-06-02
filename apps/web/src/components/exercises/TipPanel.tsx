"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";

import { MUENZEN_REWARDS } from "@wortschatz/config";

type Props = {
  tip: string;
  revealed: boolean;
  onReveal: () => void;
  /** Lock the panel after the exercise has been submitted. */
  disabled?: boolean;
};

/**
 * Show-tip affordance for the exercise runner. Before reveal, renders a
 * single button warning that using the tip caps the reward at
 * EXERCISE_COMPLETE_WITH_TIP (3) Münzen instead of EXERCISE_COMPLETE
 * (10). After reveal, renders the tip text and stays visible — there's
 * no "hide" path because the reward penalty is irreversible.
 */
export function TipPanel({ tip, revealed, onReveal, disabled }: Props) {
  const t = useTranslations("exercises.tip");

  if (!revealed) {
    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignSelf: "flex-start", alignItems: "center", flexWrap: "wrap" }}
      >
        <Button
          type="button"
          variant="outlined"
          color="secondary"
          size="small"
          startIcon={<LightbulbOutlinedIcon fontSize="small" />}
          onClick={onReveal}
          disabled={disabled}
          sx={{ minHeight: 40 }}
        >
          {t("show")}
        </Button>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary" }}
        >
          {t("reducedRewardNotice", {
            amount: MUENZEN_REWARDS.EXERCISE_COMPLETE_WITH_TIP,
          })}
        </Typography>
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        p: 2,
        borderRadius: 2,
        backgroundColor: "accentSoft.main",
        border: 1,
        borderColor: "divider",
      }}
    >
      <LightbulbOutlinedIcon
        fontSize="small"
        sx={{ color: "secondary.main", mt: "2px", flexShrink: 0 }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", display: "block", lineHeight: 1 }}
        >
          {t("label")}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
          {tip}
        </Typography>
      </Box>
    </Box>
  );
}
