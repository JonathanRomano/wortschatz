"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";

import type { RendererProps } from "../types";

export function TranslationRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const source = String(content.sourceText ?? "");
  const lang = String(content.sourceLanguage ?? "en").toUpperCase();
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          borderRadius: 3,
          border: 1,
          borderStyle: "solid",
          borderColor: "divider",
          backgroundColor: "surfaceAlt.main",
          p: { xs: 2, sm: 2.5 },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="overline" sx={{ fontWeight: 500, color: "text.secondary" }}>
            {t("translationLabelSource")}
          </Typography>
          <Chip
            label={lang}
            size="small"
            sx={{
              borderRadius: 9999,
              backgroundColor: "background.paper",
              color: "text.primary",
              fontFamily:
                'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
              fontSize: "0.625rem",
              height: 20,
            }}
          />
        </Stack>
        <Typography
          variant="h4"
          component="p"
          sx={{
            mt: 1,
            fontSize: { xs: "1.125rem", sm: "1.5rem" },
            lineHeight: 1.55,
            fontFamily: "var(--font-fraunces), serif",
            fontWeight: 400,
          }}
        >
          {source}
        </Typography>
      </Box>
      <TextField
        multiline
        minRows={4}
        placeholder={t("translationPlaceholder")}
        disabled={disabled}
        value={String(value.translation ?? "")}
        onChange={(e) => onChange({ translation: e.target.value })}
        fullWidth
        slotProps={{ htmlInput: { "aria-label": t("translationPlaceholder") } }}
      />
    </Stack>
  );
}
