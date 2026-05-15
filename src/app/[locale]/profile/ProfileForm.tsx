"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { UiLanguage } from "@prisma/client";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";

import { saveProfile } from "./actions";

const LANGS: { code: UiLanguage; label: string }[] = [
  { code: "EN", label: "English" },
  { code: "PT", label: "Português" },
  { code: "TR", label: "Türkçe" },
  { code: "UK", label: "Українська" },
];

export function ProfileForm({
  name: initialName,
  email,
  preferredLanguage,
}: {
  name: string;
  email: string;
  preferredLanguage: UiLanguage;
}) {
  const t = useTranslations("profile");
  const [name, setName] = useState(initialName);
  const [lang, setLang] = useState<UiLanguage>(preferredLanguage);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Stack
      component="form"
      action={(formData: FormData) => {
        setSaved(false);
        startTransition(async () => {
          await saveProfile(formData);
          setSaved(true);
        });
      }}
      spacing={2}
    >
      <TextField
        name="name"
        label={t("name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
      />
      <TextField
        label={t("email")}
        value={email}
        disabled
      />
      <TextField
        select
        name="preferredLanguage"
        label={t("preferredLanguage")}
        value={lang}
        onChange={(e) => setLang(e.target.value as UiLanguage)}
      >
        {LANGS.map((l) => (
          <MenuItem key={l.code} value={l.code}>
            {l.label}
          </MenuItem>
        ))}
      </TextField>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ pt: 1, alignItems: { xs: "stretch", sm: "center" } }}
      >
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={pending}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          {pending ? "…" : t("save")}
        </Button>
        {saved ? (
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "success.main" }}
          >
            {t("saved")}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
