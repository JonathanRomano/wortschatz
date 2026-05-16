"use client";

import dynamic from "next/dynamic";

// Lazy wrapper for the Recharts area chart. Recharts pulls in
// `ResizeObserver` at render time and historically misbehaves under
// Next.js SSR — disabling SSR avoids hydration mismatches without
// affecting the user experience (the chart renders within a frame of
// hydration completing).
export const MuenzenSeriesChart = dynamic(
  () =>
    import("./MuenzenSeriesChart").then((m) => ({
      default: m.MuenzenSeriesChart,
    })),
  { ssr: false },
);
