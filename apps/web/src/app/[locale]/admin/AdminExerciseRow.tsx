"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { CefrLevel, ExerciseStatus, ExerciseType } from "@prisma/client";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";

import { LevelChip } from "@/components/ui/LevelChip";
import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { setExerciseStatus } from "./actions";

export function AdminExerciseRow({
  id,
  title,
  type,
  level,
  status: initialStatus,
}: {
  id: string;
  title: string;
  type: ExerciseType;
  level: CefrLevel;
  status: ExerciseStatus;
}) {
  const t = useTranslations("admin");
  const tt = useTranslations("exerciseTypes");
  const [status, setStatus] = useState<ExerciseStatus>(initialStatus);
  const [pending, startTransition] = useTransition();

  const change = (next: ExerciseStatus) =>
    startTransition(async () => {
      await setExerciseStatus(id, next);
      setStatus(next);
    });

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      sx={{
        py: 1.5,
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <LevelChip level={level} size="sm" />
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "center", color: "text.secondary" }}
          >
            <ExerciseTypeIcon type={type} size={14} color="inherit" />
            <Typography variant="caption">{tt(type)}</Typography>
          </Stack>
        </Stack>
        <Typography
          variant="body2"
          sx={{ mt: 0.5, fontWeight: 500, wordBreak: "break-word" }}
        >
          {title}
        </Typography>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        sx={{ flexWrap: "wrap", alignItems: "center", flexShrink: { sm: 0 } }}
      >
        <StatusBadge status={status} />
        {status === "DRAFT" ? (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Button
              type="button"
              variant="contained"
              color="primary"
              size="small"
              disabled={pending}
              onClick={() => change("PUBLISHED")}
            >
              {t("approve")}
            </Button>
            <Button
              type="button"
              variant="outlined"
              size="small"
              disabled={pending}
              onClick={() => change("ARCHIVED")}
            >
              {t("reject")}
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}

function StatusBadge({ status }: { status: ExerciseStatus }) {
  const styling =
    status === "PUBLISHED"
      ? {
          bgcolor: "successSoft.main",
          color: "success.main",
          borderColor: "success.main",
        }
      : status === "ARCHIVED"
        ? {
            bgcolor: "surfaceAlt.main",
            color: "text.secondary",
            borderColor: "divider",
          }
        : {
            bgcolor: "accentSoft.main",
            color: "accentSoft.contrastText",
            borderColor: "secondary.main",
          };
  return (
    <Chip
      label={status}
      size="small"
      variant="outlined"
      sx={{
        borderRadius: 9999,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        fontWeight: 600,
        fontSize: "0.625rem",
        height: 22,
        ...styling,
      }}
    />
  );
}
