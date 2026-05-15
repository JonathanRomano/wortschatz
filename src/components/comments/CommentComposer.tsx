"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

import { COMMENT_MAX_LENGTH } from "@/config/moderation";
import type { CommentDTO } from "@/lib/comments/types";

type Props = {
  exerciseId: string;
  isAuthed: boolean;
  onCreated: (comment: CommentDTO) => void;
};

function mapErrorCode(code: string | undefined): string {
  switch (code) {
    case "too_long":
      return "errors.tooLong";
    case "blocked_word":
      return "errors.blocked";
    case "rate_limited":
      return "errors.rateLimited";
    case "unauthorized":
    case "forbidden":
      return "errors.notAllowed";
    default:
      return "errors.generic";
  }
}

export function CommentComposer({ exerciseId, isAuthed, onCreated }: Props) {
  const t = useTranslations("comments");
  const [value, setValue] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = value.trim();
  const remaining = COMMENT_MAX_LENGTH - trimmed.length;
  const canSubmit = isAuthed && trimmed.length > 0 && remaining >= 0;

  function submit() {
    if (!canSubmit) return;
    setErrorKey(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/exercises/${exerciseId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrorKey(mapErrorCode(body.error));
          return;
        }
        const created = (await res.json()) as CommentDTO;
        onCreated(created);
        setValue("");
      } catch {
        setErrorKey("errors.generic");
      }
    });
  }

  if (!isAuthed) {
    return (
      <Alert
        severity="info"
        sx={{
          backgroundColor: "surfaceAlt.main",
          color: "text.secondary",
          border: 1,
          borderColor: "divider",
          borderStyle: "solid",
        }}
        icon={false}
      >
        {t("composer.signInRequired")}
      </Alert>
    );
  }

  return (
    <Stack spacing={1}>
      <TextField
        multiline
        rows={3}
        fullWidth
        placeholder={t("composer.placeholder")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        slotProps={{ htmlInput: { maxLength: COMMENT_MAX_LENGTH } }}
        disabled={pending}
      />
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography
          variant="caption"
          sx={{
            color: remaining < 0 ? "error.main" : "text.secondary",
          }}
        >
          {t("composer.charsLeft", { count: Math.max(0, remaining) })}
        </Typography>
        <Button
          type="button"
          variant="contained"
          color="primary"
          onClick={submit}
          disabled={!canSubmit || pending}
        >
          {t("composer.submit")}
        </Button>
      </Stack>
      {errorKey ? (
        <Alert severity="error" onClose={() => setErrorKey(null)}>
          {t(errorKey as Parameters<typeof t>[0])}
        </Alert>
      ) : null}
    </Stack>
  );
}
