"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

import type { RendererProps } from "../types";

/**
 * Feature flag — Overnight loop iter 8. When a listening exercise has no
 * recorded audio (the common case), speak its German transcript with the
 * browser SpeechSynthesis API instead of just printing it — otherwise every
 * listening item degrades into a reading item. The transcript is hidden behind
 * a toggle so the learner listens first. Flip to `false` to restore the
 * original always-show-the-transcript fallback.
 */
export const LISTENING_TTS: boolean = true;

export function ListeningComprehensionRenderer({
  content,
  value,
  onChange,
  disabled,
}: RendererProps) {
  const t = useTranslations("renderers");
  const transcript = String(content.transcript ?? "");
  const audioUrl = content.audioUrl ? String(content.audioUrl) : null;
  const question = String(content.question ?? "");

  // TTS support is resolved after mount to avoid a hydration mismatch (the
  // server can't know if the browser supports speechSynthesis). With the flag
  // off, or when TTS is unavailable, we reveal the transcript so a listening
  // item still degrades to a readable one.
  const [mounted, setMounted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(!LISTENING_TTS);
  useEffect(() => {
    setMounted(true);
    const available =
      typeof window !== "undefined" && "speechSynthesis" in window;
    if (LISTENING_TTS && !available) setShowTranscript(true);
  }, []);
  const ttsAvailable =
    LISTENING_TTS &&
    mounted &&
    typeof window !== "undefined" &&
    "speechSynthesis" in window;

  const speak = () => {
    if (!ttsAvailable || !transcript) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.lang = "de-DE";
    utterance.rate = 0.9; // a touch slower for learners
    synth.speak(utterance);
  };

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
          {LISTENING_TTS ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ alignItems: { sm: "center" } }}
            >
              <Button
                variant="contained"
                onClick={speak}
                disabled={disabled || !ttsAvailable}
                startIcon={<VolumeUpIcon />}
              >
                {t("listeningPlay")}
              </Button>
              <Button
                variant="text"
                onClick={() => setShowTranscript((v) => !v)}
                sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
              >
                {showTranscript
                  ? t("listeningHideTranscript")
                  : t("listeningShowTranscript")}
              </Button>
            </Stack>
          ) : null}
          {mounted && !ttsAvailable ? (
            <Typography variant="body2" sx={{ mt: 1.5, color: "text.secondary" }}>
              {t("listeningAudioMissing")}
            </Typography>
          ) : null}
          {showTranscript ? (
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
          ) : null}
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
