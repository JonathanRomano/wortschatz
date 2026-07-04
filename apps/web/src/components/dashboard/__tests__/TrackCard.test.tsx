import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";

import { TrackCard } from "@/components/dashboard/TrackCard";
import { renderLight, renderDark } from "@/test/renderWithTheme";

describe("<TrackCard />", () => {
  it("shows the track title, profession chip, and progress", () => {
    renderLight(
      <TrackCard profession="pflege" percent={58} doneToday={2} planTotal={5} />,
    );
    expect(screen.getByText("track.title")).toBeInTheDocument();
    expect(screen.getByText("professions.pflege")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    // Passthrough i18n mock → the label key, plus the done/total suffix.
    expect(screen.getByText(/track\.progressLabel · 2\/5/)).toBeInTheDocument();
  });

  it("links to the track page", () => {
    renderLight(
      <TrackCard profession="it" percent={0} doneToday={0} planTotal={3} />,
    );
    const link = screen.getByRole("link", { name: "track.continue" });
    expect(link).toHaveAttribute("href", "/track");
  });

  it("omits the plan suffix when the plan is empty", () => {
    renderLight(
      <TrackCard profession="gastro" percent={100} doneToday={0} planTotal={0} />,
    );
    expect(screen.getByText("track.progressLabel")).toBeInTheDocument();
  });

  it("renders in dark mode", () => {
    renderDark(
      <TrackCard profession="handwerk" percent={25} doneToday={1} planTotal={4} />,
    );
    expect(screen.getByText("track.title")).toBeInTheDocument();
  });
});
