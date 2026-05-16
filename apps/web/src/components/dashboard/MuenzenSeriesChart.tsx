"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import type { MuenzenSeriesPoint } from "@/lib/dashboard/aggregations";

type Props = {
  data: MuenzenSeriesPoint[];
  locale: string;
  emptyMessage: string;
};

// Cumulative Münzen balance area chart. The fill is an amber gradient
// fading to transparent so the silhouette reads as the headline and the
// numbers underneath stay legible. Both colors are resolved via MUI's
// theme so dark mode picks the lighter amber automatically.
export function MuenzenSeriesChart({ data, locale, emptyMessage }: Props) {
  const theme = useTheme();

  // SSR-safe locale formatter — `Intl.DateTimeFormat` is universal.
  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );

  const fullFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );

  // The chart is considered empty when every point is the same balance
  // and that balance is zero. A flat positive line is still meaningful
  // (the user earned Münzen earlier and hasn't moved since) so we don't
  // treat that as empty.
  const allZero =
    data.length === 0 || data.every((d) => d.balance === 0);

  if (allZero) {
    return (
      <Box
        sx={{
          height: 240,
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

  // Unique-ish gradient id so multiple instances on the page don't
  // collide in the global <defs> namespace.
  const gradientId = "muenzen-series-gradient";
  const amber = theme.palette.secondary.main;
  const ink = theme.palette.primary.main;

  // Pre-format dates for the X axis. Doing this server-side in the
  // data shape would lock the labels to the request locale; doing it
  // client-side keeps `data` locale-neutral.
  const display = data.map((d) => ({
    ...d,
    label: fmt.format(new Date(`${d.date}T00:00:00Z`)),
  }));

  return (
    <Box sx={{ height: 240, mt: 2, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={display}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={amber} stopOpacity={0.55} />
              <stop offset="100%" stopColor={amber} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={theme.palette.divider}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            stroke={theme.palette.divider}
            // Avoid overflowing tick labels on narrow viewports.
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, "auto"]}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            stroke={theme.palette.divider}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: ink, strokeOpacity: 0.2 }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const first = payload[0];
              if (!first) return null;
              const point = first.payload as MuenzenSeriesPoint;
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
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      {fullFmt.format(new Date(`${point.date}T00:00:00Z`))}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: "baseline" }}
                    >
                      <Typography variant="h6" sx={{ lineHeight: 1 }}>
                        {point.balance.toLocaleString(locale)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "secondary.main", fontWeight: 600 }}
                      >
                        M
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={amber}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            // The default activeDot is fine but we re-state the stroke
            // so it picks up the amber even when dark-mode flips.
            activeDot={{ r: 4, stroke: amber, fill: amber }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
