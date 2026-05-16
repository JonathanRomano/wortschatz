"use client";

import dynamic from "next/dynamic";

// Lazy wrapper for the Recharts radar chart. Same reasoning as
// MuenzenSeriesChart.client.tsx — Recharts touches DOM-only APIs and
// we want a clean hydration boundary.
export const ProficiencyRadar = dynamic(
  () =>
    import("./ProficiencyRadar").then((m) => ({
      default: m.ProficiencyRadar,
    })),
  { ssr: false },
);
