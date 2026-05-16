"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { CefrLevel, UiLanguage } from "@wortschatz/database";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Slider from "@mui/material/Slider";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";

import { saveProfile, type SaveProfileResult } from "./actions";

// UI-language picker (used for the i18n of Wortschatz itself).
const LANGS: { code: UiLanguage; label: string }[] = [
  { code: "EN", label: "English" },
  { code: "PT", label: "Português" },
  { code: "TR", label: "Türkçe" },
  { code: "UK", label: "Українська" },
];

// Native-language picker. ISO 639-1 lowercase. Kept in sync with the
// allow-list in actions.ts.
const NATIVE_LANGS: { code: string; label: string }[] = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "uk", label: "Українська" },
  { code: "de", label: "Deutsch" },
];

const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

type Props = {
  name: string;
  email: string;
  preferredLanguage: UiLanguage;
  bio: string;
  nativeLanguage: string;
  learningLevel: CefrLevel | "";
  dailyGoal: number;
  avatarUrl: string | null;
};

type SnackState =
  | { open: false }
  | { open: true; severity: "success" | "error"; message: string };

export function ProfileForm({
  name: initialName,
  email,
  preferredLanguage,
  bio: initialBio,
  nativeLanguage: initialNative,
  learningLevel: initialLevel,
  dailyGoal: initialGoal,
  avatarUrl: initialAvatarUrl,
}: Props) {
  const t = useTranslations("profile");
  const [name, setName] = useState(initialName);
  const [lang, setLang] = useState<UiLanguage>(preferredLanguage);
  const [bio, setBio] = useState(initialBio);
  const [native, setNative] = useState(initialNative);
  const [level, setLevel] = useState<CefrLevel | "">(initialLevel);
  const [dailyGoal, setDailyGoal] = useState(initialGoal);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [snack, setSnack] = useState<SnackState>({ open: false });
  const [pending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const charsLeft = 280 - bio.length;

  function openSnack(severity: "success" | "error", message: string) {
    setSnack({ open: true, severity, message });
  }

  function closeSnack() {
    setSnack({ open: false });
  }

  async function handleAvatarChange(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        const message =
          data.error === "too_large"
            ? t("avatar.errorTooLarge")
            : data.error === "unsupported_mime"
              ? t("avatar.errorMime")
              : t("avatar.errorInvalid");
        openSnack("error", message);
        return;
      }
      const data = (await res.json()) as { ok: true; avatarUrl: string };
      setAvatarUrl(data.avatarUrl);
    } catch {
      openSnack("error", t("avatar.errorInvalid"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAvatarRemove() {
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (res.ok) setAvatarUrl(null);
    } finally {
      setUploading(false);
    }
  }

  // Build deterministic initials for the empty-avatar fallback.
  // Splitting on whitespace and taking up to two leading characters
  // covers most names without needing a full Intl segmenter.
  const initials = (name || email)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <Stack
        component="form"
        action={(formData: FormData) => {
          formData.set("dailyGoal", String(dailyGoal));
          startTransition(async () => {
            const result: SaveProfileResult = await saveProfile(formData);
            if (result.ok) {
              openSnack("success", t("saved"));
            } else {
              openSnack("error", t("saveError"));
            }
          });
        }}
        spacing={2.5}
      >
        {/* Avatar block — clicking the avatar opens the hidden file input
         so the click target stays a single 96px circle on mobile. */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
        >
          <Avatar
            src={avatarUrl ?? undefined}
            alt={name || email}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              width: { xs: 112, sm: 144 },
              height: { xs: 112, sm: 144 },
              cursor: "pointer",
              fontSize: { xs: "2.25rem", sm: "2.75rem" },
              fontFamily: "var(--font-display)",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              transition: "transform 200ms ease, box-shadow 200ms ease",
              "&:hover, &:focus-within": {
                transform: "scale(1.02)",
                boxShadow: 3,
              },
            }}
          >
            {!avatarUrl ? initials : null}
          </Avatar>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            <Button
              type="button"
              variant="outlined"
              color="primary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              sx={{ minHeight: 44 }}
            >
              {t("avatar.uploadLabel")}
            </Button>
            {avatarUrl ? (
              <Button
                type="button"
                variant="text"
                color="primary"
                disabled={uploading}
                onClick={handleAvatarRemove}
                sx={{ minHeight: 44 }}
              >
                {t("avatar.removeLabel")}
              </Button>
            ) : null}
          </Stack>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleAvatarChange(file);
            }}
          />
        </Stack>

        <TextField
          name="name"
          label={t("name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <TextField label={t("email")} value={email} disabled />
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

        <Box>
          <TextField
            name="bio"
            label={t("bio.label")}
            placeholder={t("bio.placeholder")}
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 280))}
            multiline
            rows={3}
            // `slotProps.htmlInput` is the v9 equivalent of the (now
            // removed) `inputProps` prop. We also clamp in `onChange`
            // above so the count display stays in sync even if a
            // browser ignores the native `maxlength` (rare, but cheap).
            slotProps={{ htmlInput: { maxLength: 280 } }}
            fullWidth
          />
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.5,
              textAlign: "right",
              color: "text.secondary",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {t("bio.charsLeft", { count: charsLeft })}
          </Typography>
        </Box>

        <TextField
          select
          name="nativeLanguage"
          label={t("nativeLanguage.label")}
          value={native}
          onChange={(e) => setNative(e.target.value)}
        >
          <MenuItem value="">{t("placeholder")}</MenuItem>
          {NATIVE_LANGS.map((l) => (
            <MenuItem key={l.code} value={l.code}>
              {l.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          name="learningLevel"
          label={t("learningLevel.label")}
          value={level}
          onChange={(e) => setLevel(e.target.value as CefrLevel | "")}
        >
          <MenuItem value="">{t("placeholder")}</MenuItem>
          {CEFR_LEVELS.map((l) => (
            <MenuItem key={l} value={l}>
              {l}
            </MenuItem>
          ))}
        </TextField>

        <Box>
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "text.primary" }}
            >
              {t("dailyGoal.label")}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFeatureSettings: '"tnum" 1',
                color: "secondary.main",
                fontWeight: 600,
                minWidth: 32,
                textAlign: "right",
              }}
            >
              {dailyGoal}
            </Typography>
          </Stack>
          <Slider
            value={dailyGoal}
            onChange={(_, value) => {
              if (typeof value === "number") setDailyGoal(value);
            }}
            min={1}
            max={30}
            step={1}
            valueLabelDisplay="auto"
            sx={{
              color: "secondary.main",
              mt: 0.5,
              // Bump the rail's hit target so it stays comfortable on
              // touch. The default 4px rail is fine visually but the
              // pointer-capture area should be ≥ 44px tall.
              "& .MuiSlider-rail": { height: 4 },
              "& .MuiSlider-track": { height: 4 },
              "& .MuiSlider-thumb": { width: 20, height: 20 },
            }}
          />
          {/* The server action reads `dailyGoal` directly from FormData;
              the hidden input keeps progressive-enhancement working if
              the page is submitted without JS. */}
          <input type="hidden" name="dailyGoal" value={dailyGoal} />
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{
            pt: 1,
            alignItems: { xs: "stretch", sm: "center" },
            position: "sticky",
            bottom: 0,
          }}
        >
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={pending}
            sx={{
              width: { xs: "100%", sm: "auto" },
              minHeight: 44,
            }}
          >
            {pending ? "…" : t("save")}
          </Button>
        </Stack>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={closeSnack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snack.open ? (
          <Alert
            onClose={closeSnack}
            severity={snack.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {snack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
