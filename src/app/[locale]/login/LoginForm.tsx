"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";

import { signInWithCredentials, signInWithGoogle } from "./actions";

export function LoginForm() {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Stack spacing={2.5}>
      <Stack
        component="form"
        action={(formData: FormData) => {
          setError(null);
          startTransition(async () => {
            const res = await signInWithCredentials(formData);
            if (res?.error) setError(t(res.error));
          });
        }}
        spacing={2}
      >
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
          autoComplete="current-password"
          slotProps={{ htmlInput: { minLength: 6 } }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={pending}
          fullWidth
        >
          {pending ? "…" : t("submitLogin")}
        </Button>
        {error ? (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        ) : null}
      </Stack>

      <Divider>{t("or")}</Divider>

      <form action={signInWithGoogle}>
        <Button type="submit" variant="outlined" fullWidth>
          {t("googleLogin")}
        </Button>
      </form>
    </Stack>
  );
}
