import { describe, it, expect } from "vitest";

import { Footer } from "@/components/layout/Footer";
import { renderLight, renderDark } from "@/test/renderWithTheme";

// `Footer` is an async server component. In a test env we can resolve
// it directly (it returns JSX once awaited) and then hand the resulting
// element to React Testing Library inside the theme wrapper.

async function resolveFooter() {
  return (await Footer()) as React.ReactElement;
}

describe("<Footer />", () => {
  it("renders in light mode without throwing", async () => {
    const element = await resolveFooter();
    const { container } = renderLight(element);
    expect(container.querySelector("footer")).not.toBeNull();
  });

  it("renders in dark mode without throwing", async () => {
    const element = await resolveFooter();
    const { container } = renderDark(element);
    expect(container.querySelector("footer")).not.toBeNull();
  });

  it("includes the app name from the translations namespace", async () => {
    const element = await resolveFooter();
    const { getByText } = renderLight(element);
    // setup.ts mocks getTranslations to return `${namespace}.${key}`.
    expect(getByText("app.name")).toBeInTheDocument();
  });
});
