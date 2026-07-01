"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme, alpha } from "@mui/material/styles";
import { useTranslations } from "next-intl";

import {
  heatmapThresholds,
  type HeatmapDay,
} from "@/lib/dashboard/aggregations";

type Props = {
  data: HeatmapDay[];
  locale: string;
};

// GitHub-style activity heatmap rendered as an inline SVG. We stick to
// vanilla MUI/Box + <rect> so we don't need a charting lib for this
// one — Recharts has no native calendar layout. Every visual choice
// (size, gap, color buckets) is derived from MUI theme tokens so dark
// mode "just works".
//
// Layout: rows = weekdays (Mon → Sun), columns = ISO week. The last
// column is the week containing today; earlier columns extend back
// `windowDays` calendar days. Cells before the start of the window
// are skipped (not drawn) so the top-left of the grid lines up with
// the actual oldest day rather than a placeholder.

const CELL = 14; // px, square
const GAP = 3; // px between cells
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// JS getUTCDay(): Sun=0, Mon=1, ..., Sat=6. We want Mon-first rows.
function rowIndexFromDate(date: Date): number {
  const day = date.getUTCDay();
  return (day + 6) % 7; // Mon=0, ..., Sun=6
}

export function ActivityHeatmap({ data, locale }: Props) {
  const theme = useTheme();
  const t = useTranslations("dashboard.charts.activity");

  const [hovered, setHovered] = useState<HeatmapDay | null>(null);

  const fmtTooltipDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );

  // Five buckets: 0, 1, 2, 3, 4+. Mapped to a soft → strong amber
  // ramp. The "zero" bucket uses the warm surface alt so empty days
  // still register as a cell, not a hole in the grid.
  const amber = theme.palette.secondary.main;
  const palette = useMemo(
    () => [
      theme.palette.surfaceAlt.main,
      alpha(amber, 0.25),
      alpha(amber, 0.45),
      alpha(amber, 0.7),
      amber,
    ],
    [amber, theme.palette.surfaceAlt.main],
  );

  // Bucket thresholds scale to this learner's own activity so the gradient is
  // meaningful whether they do 2 or 20 exercises on a busy day.
  const [t1, t2, t3] = useMemo(
    () => heatmapThresholds(data.map((d) => d.count)),
    [data],
  );

  function colorFor(count: number): string {
    if (count <= 0) return palette[0]!;
    if (count <= t1) return palette[1]!;
    if (count <= t2) return palette[2]!;
    if (count <= t3) return palette[3]!;
    return palette[4]!;
  }

  // Position every day on the grid. Column index is the number of full
  // weeks (Mon → Mon) between the day and the start. The grid starts at
  // the Monday on or before the oldest day so the leftmost column is
  // sometimes partial — those leading cells are simply absent.
  const cells = useMemo(() => {
    if (data.length === 0) return { cells: [], cols: 0 };
    const firstDay = new Date(`${data[0]!.date}T00:00:00Z`);
    const offsetIntoWeek = rowIndexFromDate(firstDay); // 0 = Mon
    // Grid origin: the Monday on or before firstDay.
    const MS_PER_DAY = 86_400_000;
    const gridStart = new Date(
      firstDay.getTime() - offsetIntoWeek * MS_PER_DAY,
    );

    const placed = data.map((d) => {
      const day = new Date(`${d.date}T00:00:00Z`);
      const daysFromOrigin = Math.round(
        (day.getTime() - gridStart.getTime()) / MS_PER_DAY,
      );
      const col = Math.floor(daysFromOrigin / 7);
      const row = rowIndexFromDate(day);
      return { ...d, col, row };
    });
    const cols = placed.length === 0
      ? 0
      : placed.reduce((acc, c) => Math.max(acc, c.col), 0) + 1;
    return { cells: placed, cols };
  }, [data]);

  const width = cells.cols * (CELL + GAP) - GAP;
  const height = 7 * (CELL + GAP) - GAP;

  return (
    <Box sx={{ mt: 2, width: "100%", overflowX: "auto" }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "flex-start", minWidth: width }}
      >
        {/* Weekday labels: only show Mon/Wed/Fri to keep the column
            tight on mobile. */}
        <Stack
          spacing={`${GAP}px`}
          sx={{ pt: "2px", fontSize: 10, color: "text.secondary" }}
        >
          {WEEKDAYS.map((d, i) => (
            <Box
              key={d}
              sx={{
                height: CELL,
                display: "flex",
                alignItems: "center",
                fontFamily:
                  'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
                fontSize: 10,
                color: "text.secondary",
                visibility: i % 2 === 0 ? "visible" : "hidden",
              }}
            >
              {d}
            </Box>
          ))}
        </Stack>

        <Box sx={{ position: "relative" }}>
          <Box
            component="svg"
            width={width}
            height={height}
            role="img"
            aria-label={t("title")}
            sx={{ display: "block" }}
          >
            {cells.cells.map((c) => {
              const x = c.col * (CELL + GAP);
              const y = c.row * (CELL + GAP);
              return (
                <rect
                  key={c.date}
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  ry={3}
                  fill={colorFor(c.count)}
                  stroke={
                    hovered?.date === c.date
                      ? theme.palette.primary.main
                      : "transparent"
                  }
                  strokeWidth={1.5}
                  onMouseEnter={() => setHovered(c)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(c)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                  style={{ cursor: "default", outline: "none" }}
                >
                  <title>
                    {t("tooltip", {
                      count: c.count,
                      date: fmtTooltipDate.format(
                        new Date(`${c.date}T00:00:00Z`),
                      ),
                    })}
                  </title>
                </rect>
              );
            })}
          </Box>

          {/* Floating tooltip echoing the SVG <title> for users that
              don't get native title popovers (touch devices). */}
          {hovered ? (
            <Paper
              elevation={3}
              sx={{
                position: "absolute",
                top: -36,
                left: 0,
                px: 1.25,
                py: 0.5,
                border: 1,
                borderColor: "divider",
                backgroundColor: "background.paper",
                pointerEvents: "none",
              }}
            >
              <Typography variant="caption">
                {t("tooltip", {
                  count: hovered.count,
                  date: fmtTooltipDate.format(
                    new Date(`${hovered.date}T00:00:00Z`),
                  ),
                })}
              </Typography>
            </Paper>
          ) : null}
        </Box>
      </Stack>

      {/* Color legend — small "less … more" ramp under the grid. */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 1.5, alignItems: "center", color: "text.secondary" }}
      >
        <Typography variant="caption">{t("less")}</Typography>
        {palette.map((c, i) => (
          <Box
            key={i}
            sx={{
              width: CELL,
              height: CELL,
              borderRadius: 0.5,
              backgroundColor: c,
            }}
          />
        ))}
        <Typography variant="caption">{t("more")}</Typography>
      </Stack>
    </Box>
  );
}
