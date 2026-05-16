"use client";

import type { CefrLevel, ExerciseType } from "@wortschatz/database";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import { useRouter } from "@/i18n/navigation";

type Props = {
  type: ExerciseType;
  current: CefrLevel | undefined;
  levels: CefrLevel[];
  labels: { level: string; all: string };
};

export function LevelFilter({ type, current, levels, labels }: Props) {
  const router = useRouter();

  const handleChange = (
    _event: React.MouseEvent<HTMLElement>,
    next: CefrLevel | "all" | null,
  ) => {
    if (next === null) return;
    const qs = next === "all" ? "" : `?level=${next}`;
    router.replace(`/exercises/${type}${qs}`);
  };

  const value: CefrLevel | "all" = current ?? "all";

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", flexWrap: "wrap" }}
    >
      <Typography variant="overline" sx={{ color: "text.secondary" }}>
        {labels.level}
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={handleChange}
        size="small"
        aria-label={labels.level}
        sx={{
          flexWrap: "wrap",
          gap: 0.75,
          "& .MuiToggleButtonGroup-grouped": {
            border: 1,
            borderColor: "divider",
            borderRadius: 9999,
            minHeight: 36,
            px: 1.5,
            fontSize: "0.75rem",
            textTransform: "none",
            fontWeight: 500,
            "&.MuiToggleButtonGroup-firstButton, &.MuiToggleButtonGroup-middleButton, &.MuiToggleButtonGroup-lastButton":
              {
                borderRadius: 9999,
                marginLeft: 0,
                borderLeft: 1,
                borderLeftColor: "divider",
              },
            "&.Mui-selected": {
              backgroundColor: "primary.main",
              color: "primary.contrastText",
              borderColor: "primary.main",
              "&:hover": {
                backgroundColor: "primary.main",
              },
            },
          },
        }}
      >
        <ToggleButton value="all">{labels.all}</ToggleButton>
        {levels.map((l) => (
          <ToggleButton key={l} value={l}>
            {l}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
