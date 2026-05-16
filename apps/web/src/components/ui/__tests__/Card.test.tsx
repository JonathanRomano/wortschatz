import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";

import { Card } from "@/components/ui/Card";
import { renderLight, renderDark } from "@/test/renderWithTheme";

describe("<Card />", () => {
  it("renders its children in light mode", () => {
    renderLight(
      <Card>
        <p>card body</p>
      </Card>,
    );
    expect(screen.getByText("card body")).toBeInTheDocument();
  });

  it("renders its children in dark mode", () => {
    renderDark(
      <Card>
        <p>dark body</p>
      </Card>,
    );
    expect(screen.getByText("dark body")).toBeInTheDocument();
  });

  it("renders the accent variant without throwing", () => {
    renderLight(
      <Card accent>
        <p>highlighted</p>
      </Card>,
    );
    expect(screen.getByText("highlighted")).toBeInTheDocument();
  });

  it("supports padding=none variant", () => {
    renderLight(
      <Card padding="none">
        <p>flush</p>
      </Card>,
    );
    expect(screen.getByText("flush")).toBeInTheDocument();
  });

  it("forwards refs to the underlying paper element", () => {
    let captured: HTMLDivElement | null = null;
    renderLight(
      <Card
        ref={(node) => {
          captured = node;
        }}
      >
        <p>refable</p>
      </Card>,
    );
    expect(captured).not.toBeNull();
  });
});
