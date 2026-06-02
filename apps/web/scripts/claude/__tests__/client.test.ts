/**
 * Verifies the Claude generator client wires Helicone through the
 * @wortschatz/config helper: a plain client by default, Helicone routing
 * when HELICONE_API_KEY is set. We mock the Anthropic SDK and capture the
 * constructor arguments — no network, no real key.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const ctorArgs: unknown[] = [];
  const messagesCreate = vi.fn(async () => ({
    content: [{ type: "text", text: "ok" }],
  }));
  // Plain class so `new Anthropic(...)` behaves across resetModules() —
  // same reasoning as the ai-wrapper test.
  class AnthropicMock {
    messages = { create: messagesCreate };
    constructor(args?: unknown) {
      ctorArgs.push(args);
    }
  }
  return { ctorArgs, messagesCreate, AnthropicMock };
});

vi.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: mocks.AnthropicMock,
  Anthropic: mocks.AnthropicMock,
}));

let savedAnthropic: string | undefined;
let savedHelicone: string | undefined;

beforeEach(() => {
  vi.resetModules();
  mocks.ctorArgs.length = 0;
  mocks.messagesCreate.mockClear();
  savedAnthropic = process.env.ANTHROPIC_API_KEY;
  savedHelicone = process.env.HELICONE_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
  delete process.env.HELICONE_API_KEY;
});

afterEach(() => {
  if (savedAnthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedAnthropic;
  if (savedHelicone === undefined) delete process.env.HELICONE_API_KEY;
  else process.env.HELICONE_API_KEY = savedHelicone;
});

describe("scripts/claude/client", () => {
  it("constructs a plain Anthropic client when HELICONE_API_KEY is unset", async () => {
    const { callClaude } = await import("../client");
    await callClaude({ system: "s", user: "u", maxTokens: 16 });

    expect(mocks.ctorArgs).toHaveLength(1);
    const args = mocks.ctorArgs[0] as Record<string, unknown>;
    expect(args).toEqual({ apiKey: "test-anthropic-key" });
    expect(args.baseURL).toBeUndefined();
    expect(args.defaultHeaders).toBeUndefined();
  });

  it("routes through Helicone with source 'scripts-claude' when the key is set", async () => {
    process.env.HELICONE_API_KEY = "hel-key";
    const { callClaude } = await import("../client");
    await callClaude({ system: "s", user: "u", maxTokens: 16 });

    const args = mocks.ctorArgs[0] as {
      baseURL?: string;
      defaultHeaders?: Record<string, string>;
    };
    expect(args.baseURL).toBe("https://anthropic.helicone.ai");
    expect(args.defaultHeaders?.["Helicone-Auth"]).toBe("Bearer hel-key");
    expect(args.defaultHeaders?.["Helicone-Async"]).toBe("true");
    expect(args.defaultHeaders?.["Helicone-Property-Source"]).toBe(
      "scripts-claude",
    );
  });
});
