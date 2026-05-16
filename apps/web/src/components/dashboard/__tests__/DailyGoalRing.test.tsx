import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";

import { DailyGoalRing } from "@/components/dashboard/DailyGoalRing";
import { renderLight } from "@/test/renderWithTheme";

// We pass the already-formatted ICU strings as the parent server
// component does — the ring itself doesn't talk to next-intl, so we just
// hand-roll the labels here.
describe("<DailyGoalRing />", () => {
  it("renders the progress label for an in-progress goal", () => {
    renderLight(
      <DailyGoalRing
        done={3}
        goal={5}
        progressLabel="3 / 5"
        completeLabel="Done!"
      />,
    );
    expect(screen.getByText("3 / 5")).toBeInTheDocument();
    // Not yet complete → the "complete" badge is not rendered.
    expect(screen.queryByText("Done!")).not.toBeInTheDocument();
  });

  it("shows the complete label once done meets the goal", () => {
    renderLight(
      <DailyGoalRing
        done={5}
        goal={5}
        progressLabel="5 / 5"
        completeLabel="Goal reached"
      />,
    );
    expect(screen.getByText("5 / 5")).toBeInTheDocument();
    expect(screen.getByText("Goal reached")).toBeInTheDocument();
  });

  it("still shows the complete label when done exceeds the goal", () => {
    renderLight(
      <DailyGoalRing
        done={7}
        goal={5}
        progressLabel="7 / 5"
        completeLabel="Crushed it"
      />,
    );
    expect(screen.getByText("Crushed it")).toBeInTheDocument();
  });
});
