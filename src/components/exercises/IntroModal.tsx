"use client";

import { useTranslations } from "next-intl";
import type { ExerciseType } from "@prisma/client";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";

import { IntroScreen } from "./IntroScreen";

type Props = {
  type: ExerciseType;
  open: boolean;
  onClose: () => void;
  // When the intro is opened from a help button on an existing run,
  // the user may have already opted out. Pre-check the box so the
  // toggle reflects current state — saying "Let's go" again with the
  // box unchecked will re-enable the intro.
  initialSkip?: boolean;
};

/**
 * Modal wrapper around `<IntroScreen>` — used when the user opens the
 * intro from the help button or via the `?` keyboard shortcut. Goes
 * full-screen on mobile, otherwise dialogs at md width.
 */
export function IntroModal({ type, open, onClose, initialSkip = false }: Props) {
  const t = useTranslations("common");
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      aria-labelledby={`intro-${type}`}
    >
      <IconButton
        aria-label={t("cancel")}
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          zIndex: 1,
          minHeight: 44,
          minWidth: 44,
        }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <IntroScreen
          type={type}
          initialSkip={initialSkip}
          onContinue={onClose}
          embedded
        />
      </DialogContent>
    </Dialog>
  );
}
