"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { EXERCISE_TYPES } from "@/lib/admin/schemas";
import {
  createSavedPrompt,
  updateSavedPrompt,
  type SavedPromptDTO,
} from "@/lib/admin/client";

type ExType = (typeof EXERCISE_TYPES)[number];

export type SavePromptInitial = {
  id?: string;
  name?: string;
  description?: string | null;
  type?: ExType;
  systemPrompt?: string | null;
  userInstructions?: string | null;
};

/**
 * Create/edit a saved prompt template. Reused by the generate form
 * ("Save as template", with the type locked) and the /admin/prompts page.
 * Empty system/instructions are sent as null = "use the per-type default".
 */
export function SavePromptDialog({
  open,
  onClose,
  onSaved,
  initial,
  typeLocked = false,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (p: SavedPromptDTO) => void;
  initial?: SavePromptInitial;
  typeLocked?: boolean;
}) {
  const t = useTranslations("admin.generate.save");
  const tf = useTranslations("admin.generate.form");
  const tg = useTranslations("admin.generate.errors");
  const tTypes = useTranslations("exerciseTypes");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ExType>("FILL_IN_THE_BLANK");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userInstructions, setUserInstructions] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setType(initial?.type ?? "FILL_IN_THE_BLANK");
    setSystemPrompt(initial?.systemPrompt ?? "");
    setUserInstructions(initial?.userInstructions ?? "");
    setError(null);
    setPending(false);
  }, [open, initial]);

  const submit = async () => {
    if (!name.trim()) {
      setError(tg("generic"));
      return;
    }
    setPending(true);
    setError(null);
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      systemPrompt: systemPrompt.trim() ? systemPrompt : null,
      userInstructions: userInstructions.trim() ? userInstructions : null,
    };
    const res = initial?.id
      ? await updateSavedPrompt(initial.id, payload)
      : await createSavedPrompt(payload);
    setPending(false);
    if (!res.ok) {
      setError(res.error || tg("generic"));
      return;
    }
    onSaved(res.prompt);
    onClose();
  };

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("title")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
            fullWidth
            autoFocus
          />
          <TextField
            label={t("description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            fullWidth
          />
          <TextField
            select
            label={tf("type")}
            value={type}
            onChange={(e) => setType(e.target.value as ExType)}
            disabled={typeLocked}
            fullWidth
          >
            {EXERCISE_TYPES.map((ty) => (
              <MenuItem key={ty} value={ty}>
                {tTypes(ty)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={tf("systemOverride")}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          <TextField
            label={tf("instructionsOverride")}
            value={userInstructions}
            onChange={(e) => setUserInstructions(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
          {error ? (
            <Typography variant="caption" sx={{ color: "error.main" }}>
              {error}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending} sx={{ minHeight: 44 }}>
          {t("cancel")}
        </Button>
        <Button onClick={submit} variant="contained" disabled={pending} sx={{ minHeight: 44 }}>
          {t("submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
