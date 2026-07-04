import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";

import { renderLight } from "@/test/renderWithTheme";
import { ExerciseResult } from "@/components/exercises/ExerciseResult";

// next-intl is mocked globally to return `${namespace}.${key}`, so the streak
// line renders as "exercises.streakDays".
const base = {
  score: 80,
  feedback: "Nice work",
  explanation: "",
  reward: 10,
  alreadyEarned: false,
};

describe("ExerciseResult — streak celebration", () => {
  it("shows the streak line when the streak advanced this attempt", () => {
    renderLight(<ExerciseResult {...base} streakBonus={20} newStreak={7} />);
    expect(screen.getByText(/streakDays/)).toBeInTheDocument();
  });

  it("hides the streak line when no streak bonus was awarded", () => {
    renderLight(<ExerciseResult {...base} streakBonus={0} newStreak={7} />);
    expect(screen.queryByText(/streakDays/)).toBeNull();
  });

  it("hides the streak line when newStreak is absent", () => {
    renderLight(<ExerciseResult {...base} streakBonus={20} />);
    expect(screen.queryByText(/streakDays/)).toBeNull();
  });

  it("shows the milestone line (not the streak line) when a milestone is reached", () => {
    renderLight(
      <ExerciseResult
        {...base}
        streakBonus={50}
        newStreak={7}
        streakMilestone={7}
      />,
    );
    expect(screen.getByText(/streakMilestone/)).toBeInTheDocument();
    expect(screen.queryByText(/streakDays/)).toBeNull();
  });

  it("still shows the correct-answer line it is given", () => {
    renderLight(
      <ExerciseResult
        {...base}
        score={67}
        streakBonus={0}
        correctAnswer="Tür, Käse"
      />,
    );
    expect(screen.getByText(/Tür, Käse/)).toBeInTheDocument();
  });
});
