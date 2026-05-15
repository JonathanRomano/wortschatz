"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";

import type { RendererProps } from "../types";

export function FreeWritingRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const prompt = String(content.prompt ?? "");
  const minWords = Number(content.minWords ?? 40);
  const text = String(value.text ?? "");
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const reachedMin = wordCount >= minWords;
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
        <Typography
          variant="overline"
          sx={{ fontWeight: 500, color: "text.secondary", display: "block" }}
        >
          {t("freeWritingPrompt")}
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
          {prompt}
        </Typography>
      </Box>
      <TextField
        multiline
        minRows={8}
        disabled={disabled}
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={t("freeWritingPlaceholder")}
        fullWidth
        slotProps={{ htmlInput: { "aria-label": t("freeWritingPlaceholder") } }}
      />
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            fontFamily:
              'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
            color: reachedMin ? "success.main" : "text.secondary",
          }}
        >
          {reachedMin ? <Check /> : null}
          <Typography variant="body2" sx={{ fontFamily: "inherit", color: "inherit" }}>
            {t("freeWritingWordCount", { count: wordCount, min: minWords })}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}

function Check() {
  return (
    <Box
      component="svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5 9-12" />
    </Box>
  );
}
