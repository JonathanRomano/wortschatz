/**
 * Verifies the GPT generator client wires Helicone through the
 * @wortschatz/config helper: a plain client by default, the OpenAI Helicone
 * baseURL (with /v1) + headers when HELICONE_API_KEY is set. The OpenAI SDK
 * is mocked; we capture constructor arguments.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const ctorArgs: unknown[] = [];
  const completionsCreate = vi.fn(async () => ({
    choices: [{ message: { content: "{}" } }],
  }));
  class OpenAIMock {
    chat = { completions: { create: completionsCreate } };
    constructor(args?: unknown) {
      ctorArgs.push(args);
    }
  }
  return { ctorArgs, completionsCreate, OpenAIMock };
});

vi.mock("openai", () => ({
  __esModule: true,
  default: mocks.OpenAIMock,
  OpenAI: mocks.OpenAIMock,
}));

let savedOpenAI: string | undefined;
let savedHelicone: string | undefined;

beforeEach(() => {
  vi.resetModules();
  mocks.ctorArgs.length = 0;
  mocks.completionsCreate.mockClear();
  savedOpenAI = process.env.OPENAI_API_KEY;
  savedHelicone = process.env.HELICONE_API_KEY;
  process.env.OPENAI_API_KEY = "test-openai-key";
  delete process.env.HELICONE_API_KEY;
});

afterEach(() => {
  if (savedOpenAI === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = savedOpenAI;
  if (savedHelicone === undefined) delete process.env.HELICONE_API_KEY;
  else process.env.HELICONE_API_KEY = savedHelicone;
});

describe("scripts/gpt/client", () => {
  it("constructs a plain OpenAI client when HELICONE_API_KEY is unset", async () => {
    const { callGPT } = await import("../client");
    await callGPT({ system: "s", user: "u", maxTokens: 16 });

    expect(mocks.ctorArgs).toHaveLength(1);
    const args = mocks.ctorArgs[0] as Record<string, unknown>;
    expect(args).toEqual({ apiKey: "test-openai-key" });
    expect(args.baseURL).toBeUndefined();
    expect(args.defaultHeaders).toBeUndefined();
  });

  it("routes through Helicone with source 'scripts-gpt' when the key is set", async () => {
    process.env.HELICONE_API_KEY = "hel-key";
    const { callGPT } = await import("../client");
    await callGPT({ system: "s", user: "u", maxTokens: 16 });

    const args = mocks.ctorArgs[0] as {
      baseURL?: string;
      defaultHeaders?: Record<string, string>;
    };
    expect(args.baseURL).toBe("https://oai.helicone.ai/v1");
    expect(args.defaultHeaders?.["Helicone-Auth"]).toBe("Bearer hel-key");
    expect(args.defaultHeaders?.["Helicone-Async"]).toBe("true");
    expect(args.defaultHeaders?.["Helicone-Property-Source"]).toBe(
      "scripts-gpt",
    );
  });
});
