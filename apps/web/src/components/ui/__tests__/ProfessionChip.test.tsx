import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { PROFESSION_SLUGS } from "@wortschatz/config";

import { ProfessionChip } from "@/components/ui/ProfessionChip";
import { renderLight, renderDark } from "@/test/renderWithTheme";

// The global test setup mocks useTranslations as a passthrough, so the
// rendered label is `professions.<slug>`.
describe("<ProfessionChip />", () => {
  for (const slug of PROFESSION_SLUGS) {
    it(`renders ${slug} in light mode`, () => {
      renderLight(<ProfessionChip slug={slug} />);
      expect(screen.getByText(`professions.${slug}`)).toBeInTheDocument();
    });

    it(`renders ${slug} in dark mode`, () => {
      renderDark(<ProfessionChip slug={slug} />);
      expect(screen.getByText(`professions.${slug}`)).toBeInTheDocument();
    });
  }

  it("renders the small size variant without throwing", () => {
    renderLight(<ProfessionChip slug="pflege" size="sm" />);
    expect(screen.getByText("professions.pflege")).toBeInTheDocument();
  });

  it("exposes the localized name as the accessible label", () => {
    renderLight(<ProfessionChip slug="gastro" />);
    expect(screen.getByLabelText("professions.gastro")).toBeInTheDocument();
  });

  it("shows a per-profession glyph", () => {
    const { container } = renderLight(<ProfessionChip slug="handwerk" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
