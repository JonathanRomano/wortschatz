"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";

import type { RendererProps } from "../types";

export function ErrorCorrectionRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const sentence = String(content.sentence ?? "");
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          borderRadius: 3,
          border: 1,
          borderStyle: "solid",
          borderColor: "error.main",
          backgroundColor: "dangerSoft.main",
          p: { xs: 2, sm: 2.5 },
        }}
      >
        <Typography
          variant="overline"
          sx={{ fontWeight: 500, color: "error.main", display: "block" }}
        >
          {t("errorOriginal")}
        </Typography>
        <Typography
          variant="h4"
          component="p"
          sx={{
            mt: 1,
            wordBreak: "break-word",
            fontFamily: "var(--font-fraunces), serif",
            fontSize: { xs: "1.125rem", sm: "1.25rem" },
            fontWeight: 400,
            lineHeight: 1.55,
          }}
        >
          {sentence}
        </Typography>
      </Box>
      <TextField
        multiline
        minRows={3}
        disabled={disabled}
        value={String(value.corrected ?? "")}
        onChange={(e) => onChange({ corrected: e.target.value })}
        placeholder={t("errorCorrectedPlaceholder")}
        fullWidth
        slotProps={{ htmlInput: { "aria-label": t("errorCorrectedPlaceholder") } }}
      />
    </Stack>
  );
}
