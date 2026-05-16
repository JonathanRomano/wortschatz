import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";

import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { renderLight, renderDark } from "@/test/renderWithTheme";

describe("<MuenzenBadge />", () => {
  it("renders in light mode and shows the amount", () => {
    renderLight(<MuenzenBadge amount={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders in dark mode and shows the amount", () => {
    renderDark(<MuenzenBadge amount={1000} />);
    // Numbers are formatted via toLocaleString — accept either localized
    // separator just in case the test environment differs.
    expect(
      screen.getByText((content) => content.replace(/[\s,.]/g, "") === "1000"),
    ).toBeInTheDocument();
  });

  it("exposes an accessible Münzen label by default", () => {
    renderLight(<MuenzenBadge amount={7} />);
    // The Chip carries `aria-label="7 Münzen"`.
    expect(screen.getByLabelText("7 Münzen")).toBeInTheDocument();
  });

  it("uses the custom aria-label override when provided", () => {
    renderLight(<MuenzenBadge amount={3} label="three coins" />);
    expect(screen.getByLabelText("three coins")).toBeInTheDocument();
  });

  it("renders the M coin glyph as an inline svg", () => {
    const { container } = renderLight(<MuenzenBadge amount={5} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // The glyph carries the letter M for "Münzen".
    expect(container.textContent).toContain("M");
  });
});
