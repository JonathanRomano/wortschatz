"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

import { registerAction } from "./actions";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Stack
      component="form"
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const res = await registerAction(formData);
          if (res?.error) setError(t(res.error));
        });
      }}
      spacing={2}
    >
      <TextField
        name="name"
        label={t("name")}
        required
        autoComplete="name"
      />
      <TextField
        name="email"
        type="email"
        label={t("email")}
        required
        autoComplete="email"
        slotProps={{ htmlInput: { inputMode: "email" } }}
      />
      <TextField
        name="password"
        type="password"
        label={t("password")}
        required
        autoComplete="new-password"
        slotProps={{ htmlInput: { minLength: 6 } }}
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={pending}
        fullWidth
      >
        {pending ? "…" : t("submitRegister")}
      </Button>
      {error ? (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      ) : null}
    </Stack>
  );
}
