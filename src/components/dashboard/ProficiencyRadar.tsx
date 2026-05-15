"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme, alpha } from "@mui/material/styles";

import type { RadarPoint } from "@/lib/dashboard/aggregations";

type Props = {
  data: RadarPoint[];
  emptyMessage: string;
};

// 10-axis proficiency radar. Each spoke is one ExerciseType, the
// magnitude is the average score (0–100) of the last N attempts of
// that type. Ink-blue stroke + a translucent fill mirrors the same
// "ink-on-paper" feel the rest of the site uses for primary surfaces.
export function ProficiencyRadar({ data, emptyMessage }: Props) {
  const theme = useTheme();
  const ink = theme.palette.primary.main;

  const hasAttempts = data.some((d) => d.attempts > 0);
  if (!hasAttempts) {
    return (
      <Box
        sx={{
          height: 280,
          mt: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "text.secondary",
          px: 2,
        }}
      >
        <Typography variant="body2">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 320, mt: 2, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={theme.palette.divider} />
          <PolarAngleAxis
            dataKey="typeLabel"
            tick={{
              fill: theme.palette.text.secondary,
              fontSize: 11,
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            dataKey="avgScore"
            stroke={ink}
            strokeWidth={2}
            fill={ink}
            fillOpacity={0.25}
            isAnimationActive={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const first = payload[0];
              if (!first) return null;
              const point = first.payload as RadarPoint;
              return (
                <Paper
                  elevation={3}
                  sx={{
                    px: 1.5,
                    py: 1,
                    border: 1,
                    borderColor: "divider",
                    backgroundColor: "background.paper",
                  }}
                >
                  <Stack spacing={0.25}>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {point.typeLabel}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "baseline" }}
                    >
                      <Typography variant="h6" sx={{ lineHeight: 1 }}>
                        {Math.round(point.avgScore)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.secondary" }}
                      >
                        / 100
                      </Typography>
                    </Stack>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        // Touch up the gap between rows so the
                        // attempts line doesn't crowd the score.
                        mt: 0.25,
                      }}
                    >
                      n = {point.attempts}
                    </Typography>
                  </Stack>
                </Paper>
              );
            }}
            // Disable the default highlight band; we already paint a
            // translucent area, an extra overlay just muddies it.
            cursor={{ stroke: alpha(ink, 0.4), strokeDasharray: "3 3" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Box>
  );
}
