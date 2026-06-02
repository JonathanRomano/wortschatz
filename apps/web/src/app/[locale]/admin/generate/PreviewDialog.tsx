"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Button from "@mui/material/Button";

import { previewPrompt } from "@/lib/admin/client";
import type { PreviewRequestInput } from "@/lib/admin/schemas";

const codeSx = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "monospace",
  fontSize: "0.8rem",
  m: 0,
  p: 1.5,
  borderRadius: 1,
  backgroundColor: "surfaceAlt.main",
} as const;

/** Renders the composed system + user prompt for the current form state. */
export function PreviewDialog({
  open,
  onClose,
  request,
}: {
  open: boolean;
  onClose: () => void;
  request: PreviewRequestInput | null;
}) {
  const t = useTranslations("admin.generate.preview");
  const tg = useTranslations("admin.generate.errors");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ system: string; user: string; estimatedTokens: number } | null>(null);

  useEffect(() => {
    if (!open || !request) return;
    let active = true;
    setLoading(true);
    setError(null);
    setData(null);
    previewPrompt(request).then((res) => {
      if (!active) return;
      setLoading(false);
      if (res.ok) setData({ system: res.system, user: res.user, estimatedTokens: res.estimatedTokens });
      else setError(res.error || tg("generic"));
    });
    return () => {
      active = false;
    };
  }, [open, request, tg]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t("title")}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Stack sx={{ py: 4, alignItems: "center" }}>
            <CircularProgress size={28} />
          </Stack>
        ) : error ? (
          <Typography sx={{ color: "error.main", py: 2 }}>{error}</Typography>
        ) : data ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {t("estimatedTokens", { count: data.estimatedTokens })}
            </Typography>
            <Box>
              <Typography variant="subtitle2">{t("system")}</Typography>
              <Typography component="pre" variant="body2" sx={codeSx}>
                {data.system}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2">{t("user")}</Typography>
              <Typography component="pre" variant="body2" sx={codeSx}>
                {data.user}
              </Typography>
            </Box>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ minHeight: 44 }}>
          {t("close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
