"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";

import type { RendererProps } from "../types";

export function ReadingComprehensionRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const passage = String(content.passage ?? "");
  const question = String(content.question ?? "");
  return (
    <Stack spacing={{ xs: 2, sm: 2.5 }}>
      <Box
        component="article"
        sx={{
          borderRadius: 3,
          border: 1,
          borderStyle: "solid",
          borderColor: "divider",
          backgroundColor: "surfaceAlt.main",
          p: { xs: 2, sm: 3 },
          fontFamily: "var(--font-fraunces), serif",
          fontSize: { xs: "1.125rem", sm: "1.25rem" },
          lineHeight: 1.6,
          whiteSpace: "pre-line",
        }}
      >
        {passage}
      </Box>
      <Typography
        variant="h5"
        component="p"
        sx={{
          fontSize: { xs: "1.125rem", sm: "1.25rem" },
          fontFamily: "var(--font-fraunces), serif",
          fontWeight: 600,
          lineHeight: 1.5,
        }}
      >
        {question}
      </Typography>
      <TextField
        multiline
        minRows={4}
        placeholder={t("listeningAnswerPlaceholder")}
        disabled={disabled}
        value={String(value.answer ?? "")}
        onChange={(e) => onChange({ answer: e.target.value })}
        fullWidth
        slotProps={{ htmlInput: { "aria-label": t("listeningAnswerPlaceholder") } }}
      />
    </Stack>
  );
}
