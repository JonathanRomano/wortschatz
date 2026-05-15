"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ExerciseType } from "@prisma/client";
import IconButton from "@mui/material/IconButton";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";

import { IntroModal } from "@/components/exercises/IntroModal";

type Props = {
  type: ExerciseType;
  initialSkip: boolean;
};

/**
 * Small question-mark button used on the specific-exercise detail page
 * to open the per-type intro in a modal. Also installs the global `?`
 * (Shift+/) keyboard shortcut for the same purpose.
 */
export function ExerciseHelpButton({ type, initialSkip }: Props) {
  const t = useTranslations("exerciseIntros");
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?") return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <IconButton
        type="button"
        aria-label={t("openHelp")}
        onClick={() => setOpen(true)}
        sx={{ minHeight: 44, minWidth: 44 }}
      >
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
      <IntroModal
        type={type}
        open={open}
        onClose={() => setOpen(false)}
        initialSkip={initialSkip}
      />
    </>
  );
}
