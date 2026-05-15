import { describe, it, expect } from "vitest";
import type { ExerciseType } from "@prisma/client";

import { ExerciseTypeIcon } from "@/components/ui/ExerciseTypeIcon";
import { renderLight, renderDark } from "@/test/renderWithTheme";

const TYPES: ExerciseType[] = [
  "FILL_IN_THE_BLANK",
  "MULTIPLE_CHOICE",
  "TRANSLATION",
  "WORD_ORDER",
  "MATCHING",
  "LISTENING_COMPREHENSION",
  "READING_COMPREHENSION",
  "VERB_CONJUGATION",
  "ERROR_CORRECTION",
  "FREE_WRITING",
];

describe("<ExerciseTypeIcon />", () => {
  for (const type of TYPES) {
    it(`renders an svg for ${type} (light mode)`, () => {
      const { container } = renderLight(<ExerciseTypeIcon type={type} />);
      const svg = container.querySelector("svg");
      expect(svg, `${type} should output an <svg>`).not.toBeNull();
    });

    it(`renders an svg for ${type} (dark mode)`, () => {
      const { container } = renderDark(<ExerciseTypeIcon type={type} />);
      expect(container.querySelector("svg")).not.toBeNull();
    });
  }

  it("respects the size prop on the svg element", () => {
    const { container } = renderLight(
      <ExerciseTypeIcon type="MULTIPLE_CHOICE" size={32} />,
    );
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("32");
    expect(svg.getAttribute("height")).toBe("32");
  });

  it("uses currentColor stroke when color is the default 'inherit'", () => {
    const { container } = renderLight(<ExerciseTypeIcon type="TRANSLATION" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("stroke")).toBe("currentColor");
  });

  it("resolves a palette color when an explicit color name is passed", () => {
    const { container } = renderLight(
      <ExerciseTypeIcon type="TRANSLATION" color="primary" />,
    );
    const svg = container.querySelector("svg")!;
    // Light mode primary.main is ink-blue #1e3a5f.
    expect(svg.getAttribute("stroke")).toBe("#1e3a5f");
  });
});
