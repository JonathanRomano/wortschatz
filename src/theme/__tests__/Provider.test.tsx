import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { AppThemeProvider } from "@/theme/Provider";

describe("<AppThemeProvider />", () => {
  it("renders children in the default (light) mode", () => {
    render(
      <AppThemeProvider>
        <p>hello</p>
      </AppThemeProvider>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders children in dark mode without throwing", () => {
    render(
      <AppThemeProvider mode="dark">
        <p>dark child</p>
      </AppThemeProvider>,
    );
    expect(screen.getByText("dark child")).toBeInTheDocument();
  });
});
