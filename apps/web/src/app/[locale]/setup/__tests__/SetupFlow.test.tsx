import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  completeSetupMock: vi.fn(async (_fd: FormData) => ({ ok: true }) as const),
  skipSetupMock: vi.fn(async () => ({ ok: true }) as const),
}));

vi.mock("@/app/[locale]/setup/actions", () => ({
  completeSetup: mocks.completeSetupMock,
  skipSetup: mocks.skipSetupMock,
}));

import { SetupFlow } from "@/app/[locale]/setup/SetupFlow";
import { renderLight, renderDark } from "@/test/renderWithTheme";

const { completeSetupMock, skipSetupMock } = mocks;

beforeEach(() => {
  completeSetupMock.mockClear();
  skipSetupMock.mockClear();
});

function renderFlow(mode: "light" | "dark" = "light") {
  const ui = <SetupFlow initialLevel="" initialDailyGoal={5} />;
  return mode === "light" ? renderLight(ui) : renderDark(ui);
}

describe("<SetupFlow />", () => {
  it("shows all four professions on step 1", () => {
    renderFlow();
    for (const slug of ["pflege", "it", "gastro", "handwerk"]) {
      expect(screen.getByText(`professions.${slug}`)).toBeInTheDocument();
    }
  });

  it("keeps Continue disabled until a profession is chosen", () => {
    renderFlow();
    const next = screen.getByRole("button", { name: "setup.next" });
    expect(next).toBeDisabled();

    fireEvent.click(screen.getByText("professions.pflege"));
    expect(next).toBeEnabled();
  });

  it("walks profession → level → goal and submits the chosen values", async () => {
    renderFlow();

    fireEvent.click(screen.getByText("professions.gastro"));
    fireEvent.click(screen.getByRole("button", { name: "setup.next" }));
    expect(screen.getByText("setup.levelTitle")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "B1" }));
    fireEvent.click(screen.getByRole("button", { name: "setup.next" }));
    expect(screen.getByText("setup.goalTitle")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "B2" }));
    fireEvent.click(screen.getByRole("button", { name: "setup.finish" }));

    await waitFor(() => expect(completeSetupMock).toHaveBeenCalledTimes(1));
    const fd = completeSetupMock.mock.calls[0]![0];
    expect(fd.get("profession")).toBe("gastro");
    expect(fd.get("learningLevel")).toBe("B1");
    expect(fd.get("targetLevel")).toBe("B2");
    expect(fd.get("dailyGoal")).toBe("5");
  });

  it("supports going back a step", () => {
    renderFlow();
    fireEvent.click(screen.getByText("professions.it"));
    fireEvent.click(screen.getByRole("button", { name: "setup.next" }));
    fireEvent.click(screen.getByRole("button", { name: "setup.back" }));
    expect(screen.getByText("setup.professionTitle")).toBeInTheDocument();
  });

  it("offers the skip path on every step and calls skipSetup", async () => {
    renderFlow();
    fireEvent.click(screen.getByRole("button", { name: "setup.skip" }));
    await waitFor(() => expect(skipSetupMock).toHaveBeenCalledTimes(1));
    expect(completeSetupMock).not.toHaveBeenCalled();
  });

  it("renders in dark mode", () => {
    renderFlow("dark");
    expect(screen.getByText("setup.professionTitle")).toBeInTheDocument();
  });
});
