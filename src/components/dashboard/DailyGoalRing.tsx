"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type Props = {
  done: number;
  goal: number;
  // ICU-templated "{done} / {goal}" string from the parent server
  // component (so the formatter stays consistent with next-intl).
  progressLabel: string;
  completeLabel: string;
};

// Amber progress ring stacked over a soft "track" of `surfaceAlt`. We
// render two `CircularProgress` instances at the same size — one
// permanently full to draw the track, one determinate on top — because
// MUI's built-in track styling isn't theme-aware and bakes in a faded
// gray. Doing it this way means both colors are theme tokens and dark
// mode picks the right contrast pair automatically.
export function DailyGoalRing({
  done,
  goal,
  progressLabel,
  completeLabel,
}: Props) {
  const clampedGoal = Math.max(1, goal);
  const pct = Math.min(100, Math.round((done / clampedGoal) * 100));
  const isDone = done >= goal;

  return (
    <Stack
      sx={{ alignItems: "center", mt: 2 }}
      spacing={1.5}
    >
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={120}
          thickness={4}
          sx={{ color: "surfaceAlt.main" }}
        />
        <CircularProgress
          variant="determinate"
          value={pct}
          size={120}
          thickness={4}
          sx={{
            color: "secondary.main",
            position: "absolute",
            left: 0,
            // Slight ease-out feels less mechanical than the default
            // linear MUI transition on something this prominent.
            "& .MuiCircularProgress-circle": {
              strokeLinecap: "round",
              transition: "stroke-dashoffset 600ms ease-out",
            },
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontSize: "1.75rem",
              lineHeight: 1,
              color: "text.primary",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {progressLabel}
          </Typography>
        </Box>
      </Box>
      {isDone ? (
        <Typography
          variant="body2"
          sx={{ color: "success.main", fontWeight: 600 }}
        >
          {completeLabel}
        </Typography>
      ) : null}
    </Stack>
  );
}
