"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";

import type { RendererProps } from "../types";

export function ListeningComprehensionRenderer({ content, value, onChange, disabled }: RendererProps) {
  const t = useTranslations("renderers");
  const transcript = String(content.transcript ?? "");
  const audioUrl = content.audioUrl ? String(content.audioUrl) : null;
  const question = String(content.question ?? "");

  return (
    <Stack spacing={2}>
      {audioUrl ? (
        <Box
          component="audio"
          controls
          src={audioUrl}
          sx={{ display: "block", width: "100%", maxWidth: "100%" }}
        >
          <track kind="captions" />
        </Box>
      ) : (
        <Box
          sx={{
            borderRadius: 3,
            border: 1,
            borderStyle: "dashed",
            borderColor: "divider",
            backgroundColor: "surfaceAlt.main",
            p: { xs: 2, sm: 2.5 },
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("listeningAudioMissing")}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mt: 1.5,
              fontStyle: "italic",
              wordBreak: "break-word",
              fontFamily: "var(--font-fraunces), serif",
              color: "text.primary",
              fontSize: { xs: "1rem", sm: "1.125rem" },
            }}
          >
            “{transcript}”
          </Typography>
        </Box>
      )}
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
