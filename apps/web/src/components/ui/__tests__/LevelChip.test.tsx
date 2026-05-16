import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import type { CefrLevel } from "@prisma/client";

import { LevelChip } from "@/components/ui/LevelChip";
import { renderLight, renderDark } from "@/test/renderWithTheme";

const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

describe("<LevelChip />", () => {
  for (const level of LEVELS) {
    it(`renders ${level} in light mode`, () => {
      renderLight(<LevelChip level={level} />);
      expect(screen.getByText(level)).toBeInTheDocument();
    });

    it(`renders ${level} in dark mode`, () => {
      renderDark(<LevelChip level={level} />);
      expect(screen.getByText(level)).toBeInTheDocument();
    });
  }

  it("renders the small size variant without throwing", () => {
    renderLight(<LevelChip level="B1" size="sm" />);
    expect(screen.getByText("B1")).toBeInTheDocument();
  });

  it("uppercase styling preserves the uppercase enum label", () => {
    // The enum value is already uppercase; we assert it lands in the DOM
    // verbatim so the upstream contract holds.
    renderLight(<LevelChip level="C2" />);
    expect(screen.getByText("C2").textContent).toBe("C2");
  });
});
