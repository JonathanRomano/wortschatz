"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

import type { RendererProps } from "../types";

export function WordOrderRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const scrambled = (content.scrambled as string[] | undefined) ?? [];
  const ordered = (value.ordered as string[] | undefined) ?? [];

  const remaining = (() => {
    const counts = new Map<string, number>();
    for (const w of scrambled) counts.set(w, (counts.get(w) ?? 0) + 1);
    for (const w of ordered) counts.set(w, (counts.get(w) ?? 0) - 1);
    return scrambled.filter((w) => {
      const c = counts.get(w) ?? 0;
      if (c <= 0) return false;
      counts.set(w, c - 1);
      return true;
    });
  })();

  const pick = (word: string) => onChange({ ordered: [...ordered, word] });
  const popLast = () => onChange({ ordered: ordered.slice(0, -1) });
  const reset = () => onChange({ ordered: [] });

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          minHeight: 64,
          borderRadius: 3,
          border: 2,
          borderStyle: "dashed",
          borderColor: "divider",
          backgroundColor: "surfaceAlt.main",
          p: { xs: 2, sm: 2.5 },
        }}
      >
        {ordered.length === 0 ? (
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            {t("wordOrderEmpty")}
          </Typography>
        ) : (
          <Typography
            variant="h4"
            component="p"
            sx={{
              wordBreak: "break-word",
              fontFamily: "var(--font-fraunces), serif",
              fontSize: { xs: "1.125rem", sm: "1.5rem" },
              fontWeight: 400,
              lineHeight: 1.55,
            }}
          >
            {ordered.join(" ")}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {remaining.map((w, i) => (
          <Button
            key={`${w}-${i}`}
            type="button"
            variant="outlined"
            disabled={disabled}
            onClick={() => pick(w)}
            sx={{
              minHeight: 44,
              fontSize: "1rem",
              fontWeight: 400,
              backgroundColor: "background.paper",
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: "primary.main",
                color: "primary.contrastText",
              },
            }}
          >
            {w}
          </Button>
        ))}
      </Box>
      <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
        <Button
          type="button"
          variant="text"
          color="inherit"
          onClick={popLast}
          disabled={disabled || ordered.length === 0}
          sx={{ minHeight: 36, color: "text.secondary", px: 0 }}
        >
          {t("wordOrderUndo")}
        </Button>
        <Button
          type="button"
          variant="text"
          color="inherit"
          onClick={reset}
          disabled={disabled || ordered.length === 0}
          sx={{ minHeight: 36, color: "text.secondary", px: 0 }}
        >
          {t("wordOrderReset")}
        </Button>
      </Stack>
    </Stack>
  );
}
