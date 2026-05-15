"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { adminAdjustUser } from "./actions";

/**
 * Inline admin form to credit/debit a user's Münzen and record an
 * ADMIN_ADJUSTMENT transaction. Stacks vertically on mobile and aligns
 * on a row at `sm:` and up.
 */
export function AdminAdjustForm({
  userId,
  size = "row",
}: {
  userId: string;
  size?: "row" | "stacked";
}) {
  const t = useTranslations("admin.adjust");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError(null);
    const raw = formData.get("amount");
    const delta = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
    if (!Number.isFinite(delta) || !Number.isInteger(delta) || delta === 0) {
      setError("invalid_amount");
      return;
    }
    const rawNote = formData.get("note");
    const noteStr = typeof rawNote === "string" ? rawNote : "";
    startTransition(async () => {
      const result = await adminAdjustUser(
        userId,
        delta,
        noteStr.trim() || undefined,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAmount("");
      setNote("");
    });
  };

  return (
    <Stack
      component="form"
      action={onSubmit}
      direction={size === "row" ? { xs: "column", md: "row" } : "column"}
      spacing={1}
      sx={{ alignItems: { xs: "stretch", md: "center" } }}
    >
      <TextField
        name="amount"
        type="number"
        size="small"
        label={t("amount")}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        slotProps={{ htmlInput: { step: 1, "aria-label": t("amount") } }}
        sx={{ width: { xs: "100%", md: 110 } }}
      />
      <TextField
        name="note"
        size="small"
        label={t("note")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        slotProps={{ htmlInput: { "aria-label": t("note") } }}
        sx={{ width: { xs: "100%", md: 200 }, flex: { md: 1 } }}
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        size="small"
        disabled={pending}
        sx={{ width: { xs: "100%", md: "auto" }, minHeight: 44 }}
      >
        {pending ? "…" : t("apply")}
      </Button>
      {error ? (
        <Typography
          variant="caption"
          sx={{ color: "error.main", whiteSpace: "nowrap" }}
        >
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}
