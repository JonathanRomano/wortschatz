"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

import type { RendererProps } from "../types";

/**
 * Feature flag — Overnight loop iter 14. Replace the per-row translation
 * dropdowns with a tap-to-pair two-column board (select a German term, tap its
 * translation) — the genre-standard, mobile-friendly matching interaction. The
 * stored answer shape ({ pairs: { german: translation } }) is unchanged, so
 * grading and the schema are untouched. Flip to `false` for the old dropdowns.
 */
export const MATCHING_TAP_TO_PAIR: boolean = true;

export function MatchingRenderer(props: RendererProps) {
  return MATCHING_TAP_TO_PAIR ? (
    <TapToPairMatching {...props} />
  ) : (
    <DropdownMatching {...props} />
  );
}

function TapToPairMatching({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const german = (content.german as string[] | undefined) ?? [];
  const translations = (content.translations as string[] | undefined) ?? [];
  const pairs = (value.pairs as Record<string, string> | undefined) ?? {};

  // The German term awaiting a translation tap (local, not part of the answer).
  const [selected, setSelected] = useState<string | null>(null);

  const usedBy = (tr: string): string | undefined =>
    Object.keys(pairs).find((g) => pairs[g] === tr);

  const onTapTerm = (g: string) => {
    if (disabled) return;
    setSelected((cur) => (cur === g ? null : g));
  };

  const onTapTranslation = (tr: string) => {
    if (disabled || !selected) return;
    const next = { ...pairs };
    if (next[selected] === tr) {
      // Tapping the already-assigned translation unmatches it.
      delete next[selected];
    } else {
      // Keep translations 1:1 — drop this translation from any other term.
      const prev = usedBy(tr);
      if (prev) delete next[prev];
      next[selected] = tr;
    }
    onChange({ pairs: next });
    setSelected(null);
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {t("matchingTapHint")}
      </Typography>
      <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} sx={{ alignItems: "flex-start" }}>
        {/* Left column — German terms. */}
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          {german.map((g) => {
            const matchedTo = pairs[g];
            const isSelected = selected === g;
            return (
              <Button
                key={g}
                type="button"
                fullWidth
                disableElevation
                variant={isSelected || matchedTo ? "contained" : "outlined"}
                color={isSelected ? "primary" : matchedTo ? "success" : "primary"}
                disabled={disabled}
                onClick={() => onTapTerm(g)}
                aria-pressed={isSelected}
                sx={{ justifyContent: "space-between", textTransform: "none", py: 1.25 }}
              >
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {g}
                </Box>
                {matchedTo ? (
                  <Box component="span" sx={{ ml: 1, opacity: 0.9, fontWeight: 400 }}>
                    → {matchedTo}
                  </Box>
                ) : null}
              </Button>
            );
          })}
        </Stack>
        {/* Right column — translations. */}
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          {translations.map((tr) => {
            const used = usedBy(tr) !== undefined;
            return (
              <Button
                key={tr}
                type="button"
                fullWidth
                disableElevation
                variant={used ? "contained" : "outlined"}
                color={used ? "success" : "primary"}
                disabled={disabled || (!selected && !used)}
                onClick={() => onTapTranslation(tr)}
                sx={{ textTransform: "none", py: 1.25 }}
              >
                {tr}
              </Button>
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
}

// Original dropdown-per-row implementation, retained behind the flag.
function DropdownMatching({ content, value, onChange, disabled }: RendererProps) {
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
