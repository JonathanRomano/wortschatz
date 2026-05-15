"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

import { submitReviewRequest } from "@/lib/review/actions";

export function ReviewForm({ balance, cost }: { balance: number; cost: number }) {
  const t = useTranslations("review");
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(balance);
  const [pending, startTransition] = useTransition();

  const insufficient = remaining < cost;
  const tooShort = text.trim().length < 5;

  return (
    <Stack spacing={2}>
      <TextField
        multiline
        minRows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        fullWidth
        slotProps={{ htmlInput: { "aria-label": t("placeholder") } }}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {t("balanceLine", { balance: remaining, cost })}
        </Typography>
        <Button
          type="button"
          variant="contained"
          color="primary"
          disabled={pending || insufficient || tooShort}
          onClick={() => {
            setError(null);
            setFeedback(null);
            startTransition(async () => {
              const res = await submitReviewRequest(text);
              if (!res.ok) {
                setError(res.error === "insufficient_funds" ? t("insufficientFunds") : "Error");
              } else {
                setFeedback(res.feedback);
                setRemaining(res.remainingMuenzen);
                setText("");
              }
            });
          }}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          {pending ? "…" : t("submit")}
        </Button>
      </Stack>

      {insufficient ? (
        <Alert severity="error" role="alert">{t("insufficientFunds")}</Alert>
      ) : null}
      {error ? (
        <Alert severity="error" role="alert">{error}</Alert>
      ) : null}

      {feedback ? (
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            border: 1,
            borderStyle: "solid",
            borderColor: "divider",
            backgroundColor: "surfaceAlt.main",
            boxShadow: 1,
          }}
        >
          <Typography variant="h5" component="h2">
            {t("feedbackHeading")}
          </Typography>
          <Box
            component="pre"
            sx={{
              mt: 1,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "inherit",
              fontSize: "0.875rem",
              lineHeight: 1.55,
              color: "text.primary",
              m: 0,
            }}
          >
            {feedback}
          </Box>
        </Box>
      ) : null}
    </Stack>
  );
}
