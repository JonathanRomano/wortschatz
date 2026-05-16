import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";

import { StreakFlame } from "@/components/ui/StreakFlame";
import { renderLight, renderDark } from "@/test/renderWithTheme";

describe("<StreakFlame />", () => {
  it("renders an active streak in light mode", () => {
    renderLight(<StreakFlame days={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByLabelText("5 day streak")).toBeInTheDocument();
  });

  it("renders an active streak in dark mode", () => {
    renderDark(<StreakFlame days={14} />);
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("renders a zero streak (muted variant) without throwing", () => {
    renderLight(<StreakFlame days={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByLabelText("0 day streak")).toBeInTheDocument();
  });

  it("honors the custom aria-label override", () => {
    renderLight(<StreakFlame days={9} label="9 dias" />);
    expect(screen.getByLabelText("9 dias")).toBeInTheDocument();
  });

  it("includes the flame svg glyph", () => {
    const { container } = renderLight(<StreakFlame days={3} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
