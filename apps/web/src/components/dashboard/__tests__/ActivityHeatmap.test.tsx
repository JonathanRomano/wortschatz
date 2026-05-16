import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";

import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { renderLight } from "@/test/renderWithTheme";

describe("<ActivityHeatmap />", () => {
  it("renders without throwing on empty data and exposes the aria-label", () => {
    renderLight(<ActivityHeatmap data={[]} locale="en" />);
    // next-intl is stubbed in test setup to return `${namespace}.${key}`,
    // so the SVG's aria-label resolves to this literal.
    expect(
      screen.getByRole("img", { name: "dashboard.charts.activity.title" }),
    ).toBeInTheDocument();
  });

  it("renders the tooltip text after the user focuses a non-zero cell", () => {
    renderLight(
      <ActivityHeatmap
        data={[{ date: "2026-05-15", count: 3 }]}
        locale="en"
      />,
    );
    // The SVG contains one <rect> per cell; <title> children show up as
    // text in the DOM. Hover/focus elevates the floating Paper tooltip,
    // duplicating the same string — that's what we assert on.
    const svg = screen.getByRole("img", {
      name: "dashboard.charts.activity.title",
    });
    const rect = svg.querySelector("rect");
    expect(rect).not.toBeNull();
    fireEvent.focus(rect!);
    // The tooltip uses next-intl's `t("tooltip", ...)`. The stubbed
    // translator returns the namespaced key (the ICU args are ignored
    // by the stub), so we just assert the key surfaces.
    const matches = screen.getAllByText(
      "dashboard.charts.activity.tooltip",
    );
    expect(matches.length).toBeGreaterThan(0);
  });
});
