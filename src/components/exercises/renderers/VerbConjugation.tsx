"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";

import type { RendererProps } from "../types";

export function VerbConjugationRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const infinitive = String(content.infinitive ?? "");
  const pronoun = String(content.pronoun ?? "");
  const tense = String(content.tense ?? "Präsens");
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
            {t("conjugationOriginal")}
          </Typography>
          <Chip
            label={tense}
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
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mt: 1.5,
            alignItems: "baseline",
            flexWrap: "wrap",
            fontFamily: "var(--font-fraunces), serif",
            fontSize: { xs: "1.25rem", sm: "1.5rem" },
          }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: "inherit",
              fontSize: "inherit",
              fontWeight: 600,
            }}
          >
            {pronoun}
          </Typography>
          <Typography component="span" sx={{ color: "text.secondary" }}>
            +
          </Typography>
          <Typography
            component="span"
            sx={{
              fontFamily:
                'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
              fontSize: "1.125rem",
            }}
          >
            {infinitive}
          </Typography>
          <Typography component="span" sx={{ color: "text.secondary" }}>
            → ?
          </Typography>
        </Stack>
      </Box>
      <TextField
        type="text"
        disabled={disabled}
        value={String(value.conjugated ?? "")}
        onChange={(e) => onChange({ conjugated: e.target.value })}
        placeholder={t("conjugationPlaceholder")}
        fullWidth
        slotProps={{
          htmlInput: {
            autoCapitalize: "none",
            autoCorrect: "off",
            spellCheck: false,
            "aria-label": t("conjugationPlaceholder"),
          },
        }}
        sx={{
          "& .MuiInputBase-input": {
            fontFamily: "var(--font-fraunces), serif",
            fontSize: "1.125rem",
          },
        }}
      />
    </Stack>
  );
}
