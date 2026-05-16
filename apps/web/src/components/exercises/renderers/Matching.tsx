"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

import type { RendererProps } from "../types";

export function MatchingRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const german = (content.german as string[] | undefined) ?? [];
  const translations = (content.translations as string[] | undefined) ?? [];
  const pairs = (value.pairs as Record<string, string> | undefined) ?? {};

  const setPair = (g: string, choice: string) =>
    onChange({ pairs: { ...pairs, [g]: choice } });

  return (
    <Stack spacing={1.5}>
      {german.map((g) => (
        <Stack
          key={g}
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            borderRadius: 3,
            border: 1,
            borderStyle: "solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            p: { xs: 1.5, sm: 2 },
            boxShadow: 1,
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <Box sx={{ width: { sm: 176 }, flexShrink: { sm: 0 }, minWidth: 0 }}>
            <Typography
              variant="h5"
              component="span"
              sx={{
                fontFamily: "var(--font-fraunces), serif",
                fontWeight: 600,
                fontSize: { xs: "1.125rem", sm: "1.25rem" },
                wordBreak: "break-word",
                display: "block",
              }}
            >
              {g}
            </Typography>
          </Box>
          <TextField
            select
            value={pairs[g] ?? ""}
            disabled={disabled}
            onChange={(e) => setPair(g, e.target.value)}
            slotProps={{ htmlInput: { "aria-label": t("matchingAria", { term: g }) } }}
            sx={{ flex: { sm: 1 } }}
          >
            <MenuItem value="">{t("matchingPlaceholder")}</MenuItem>
            {translations.map((tr) => (
              <MenuItem key={tr} value={tr}>
                {tr}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      ))}
    </Stack>
  );
}
