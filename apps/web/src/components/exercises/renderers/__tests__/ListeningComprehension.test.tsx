import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderLight } from "@/test/renderWithTheme";
import { ListeningComprehensionRenderer } from "@/components/exercises/renderers/ListeningComprehension";

const TRANSCRIPT = "Guten Morgen zusammen";

const props = (content: Record<string, unknown>) => ({
  type: "LISTENING_COMPREHENSION" as const,
  content,
  value: {} as Record<string, unknown>,
  onChange: vi.fn(),
  disabled: false,
});

class MockUtterance {
  text: string;
  lang = "";
  rate = 1;
  constructor(text: string) {
    this.text = text;
  }
}

describe("ListeningComprehensionRenderer (TTS)", () => {
  let speak: ReturnType<typeof vi.fn>;
  let cancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    speak = vi.fn();
    cancel = vi.fn();
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { speak, cancel },
    });
    (
      globalThis as unknown as { SpeechSynthesisUtterance: unknown }
    ).SpeechSynthesisUtterance = MockUtterance;
  });

  afterEach(() => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    delete (globalThis as { SpeechSynthesisUtterance?: unknown })
      .SpeechSynthesisUtterance;
  });

  it("hides the transcript by default and speaks it in de-DE on play", async () => {
    renderLight(
      <ListeningComprehensionRenderer
        {...props({ transcript: TRANSCRIPT, question: "Was hörst du?" })}
      />,
    );
    // Transcript is hidden while TTS is available (listen first).
    expect(screen.queryByText(TRANSCRIPT, { exact: false })).toBeNull();

    const play = await screen.findByRole("button", { name: /listeningPlay/ });
    await userEvent.click(play);

    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
    const utterance = speak.mock.calls[0]![0] as MockUtterance;
    expect(utterance.text).toBe(TRANSCRIPT);
    expect(utterance.lang).toBe("de-DE");
  });

  it("toggles the transcript into view", async () => {
    renderLight(
      <ListeningComprehensionRenderer
        {...props({ transcript: TRANSCRIPT, question: "?" })}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /listeningShowTranscript/ }),
    );
    expect(screen.getByText(TRANSCRIPT, { exact: false })).toBeInTheDocument();
  });

  it("falls back to showing the transcript when TTS is unavailable", async () => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    renderLight(
      <ListeningComprehensionRenderer
        {...props({ transcript: TRANSCRIPT, question: "?" })}
      />,
    );
    expect(
      await screen.findByText(TRANSCRIPT, { exact: false }),
    ).toBeInTheDocument();
  });

  it("renders an audio element (not TTS) when audioUrl is present", () => {
    const { container } = renderLight(
      <ListeningComprehensionRenderer
        {...props({ transcript: TRANSCRIPT, audioUrl: "/a.mp3", question: "?" })}
      />,
    );
    expect(container.querySelector("audio")).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: /listeningPlay/ }),
    ).toBeNull();
  });
});
