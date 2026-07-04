import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderLight } from "@/test/renderWithTheme";
import {
  MatchingRenderer,
  MATCHING_TAP_TO_PAIR,
} from "@/components/exercises/renderers/Matching";

const content = { german: ["Hund", "Katze"], translations: ["dog", "cat"] };

const setup = (pairs: Record<string, string> = {}) => {
  const onChange = vi.fn();
  renderLight(
    <MatchingRenderer
      type="MATCHING"
      content={content}
      value={{ pairs }}
      onChange={onChange}
      disabled={false}
    />,
  );
  return { onChange };
};

const term = (name: RegExp) => screen.getByRole("button", { name });

describe("MatchingRenderer (tap-to-pair)", () => {
  it("ships the tap-to-pair variant enabled", () => {
    expect(MATCHING_TAP_TO_PAIR).toBe(true);
  });

  it("assigns a translation after selecting a term", async () => {
    const { onChange } = setup();
    await userEvent.click(term(/Hund/));
    await userEvent.click(term(/^dog$/));
    expect(onChange).toHaveBeenCalledWith({ pairs: { Hund: "dog" } });
  });

  it("keeps translations 1:1 — reassigning moves it off the previous term", async () => {
    const { onChange } = setup({ Katze: "dog" });
    await userEvent.click(term(/Hund/));
    await userEvent.click(term(/^dog$/));
    expect(onChange).toHaveBeenCalledWith({ pairs: { Hund: "dog" } });
  });

  it("unmatches when the already-assigned translation is tapped again", async () => {
    const { onChange } = setup({ Hund: "dog" });
    await userEvent.click(term(/Hund/));
    await userEvent.click(term(/^dog$/));
    expect(onChange).toHaveBeenCalledWith({ pairs: {} });
  });

  it("disables an unused translation until a term is selected", async () => {
    setup();
    // 'cat' is unused and no term is selected → not tappable yet.
    expect(term(/^cat$/)).toBeDisabled();
    await userEvent.click(term(/Hund/));
    expect(term(/^cat$/)).toBeEnabled();
  });
});
