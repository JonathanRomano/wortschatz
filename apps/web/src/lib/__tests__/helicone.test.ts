/**
 * Unit tests for the optional Helicone routing helpers in
 * @wortschatz/config. The contract under test:
 *
 *   - HELICONE_API_KEY unset  → overrides are `{}` (no baseURL, no headers),
 *                               so every client is identical to before.
 *   - HELICONE_API_KEY set    → overrides carry the provider-specific
 *                               baseURL and the expected header block.
 *
 * The helpers read process.env at call time, so no module reset is needed —
 * we just toggle the env var per test and restore it afterwards.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HELICONE_ANTHROPIC_BASE_URL,
  HELICONE_OPENAI_BASE_URL,
  heliconeAnthropicOverrides,
  heliconeEnabled,
  heliconeOpenAIOverrides,
  heliconeRequestHeaders,
} from "@wortschatz/config";

const KEY = "HELICONE_API_KEY";

// vi.stubEnv handles the readonly typing of process.env.NODE_ENV and
// restores everything via unstubAllEnvs. Passing `undefined` deletes the key.
beforeEach(() => {
  vi.stubEnv(KEY, undefined as unknown as string);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("heliconeEnabled", () => {
  it("is false when the key is unset or empty", () => {
    expect(heliconeEnabled()).toBe(false);
    vi.stubEnv(KEY, "");
    expect(heliconeEnabled()).toBe(false);
  });

  it("is true when the key is a non-empty string", () => {
    vi.stubEnv(KEY, "sk-helicone-123");
    expect(heliconeEnabled()).toBe(true);
  });
});

describe("heliconeAnthropicOverrides", () => {
  it("returns an empty object when the key is unset (no behavior change)", () => {
    const overrides = heliconeAnthropicOverrides("web-ai-lib");
    expect(overrides).toEqual({});
    expect("baseURL" in overrides).toBe(false);
    expect("defaultHeaders" in overrides).toBe(false);
  });

  it("returns the Anthropic baseURL + headers when the key is set", () => {
    vi.stubEnv(KEY, "sk-helicone-123");
    vi.stubEnv("NODE_ENV", "production");

    const overrides = heliconeAnthropicOverrides("web-ai-lib") as {
      baseURL: string;
      defaultHeaders: Record<string, string>;
    };

    expect(overrides.baseURL).toBe(HELICONE_ANTHROPIC_BASE_URL);
    expect(overrides.baseURL).toBe("https://anthropic.helicone.ai");
    expect(overrides.defaultHeaders).toMatchObject({
      "Helicone-Auth": "Bearer sk-helicone-123",
      "Helicone-Async": "true",
      "Helicone-Property-Environment": "production",
      "Helicone-Property-App": "wortschatz",
      "Helicone-Property-Source": "web-ai-lib",
    });
  });

  it("threads the source through to Helicone-Property-Source", () => {
    vi.stubEnv(KEY, "k");
    const overrides = heliconeAnthropicOverrides("api-service") as {
      defaultHeaders: Record<string, string>;
    };
    expect(overrides.defaultHeaders["Helicone-Property-Source"]).toBe(
      "api-service",
    );
  });

  it("defaults the environment property to 'development' when NODE_ENV is unset", () => {
    vi.stubEnv(KEY, "k");
    vi.stubEnv("NODE_ENV", undefined as unknown as string);
    const overrides = heliconeAnthropicOverrides("scripts-claude") as {
      defaultHeaders: Record<string, string>;
    };
    expect(overrides.defaultHeaders["Helicone-Property-Environment"]).toBe(
      "development",
    );
  });
});

describe("heliconeOpenAIOverrides", () => {
  it("returns an empty object when the key is unset", () => {
    expect(heliconeOpenAIOverrides("scripts-gpt")).toEqual({});
  });

  it("returns the OpenAI baseURL (with /v1) + headers when set", () => {
    vi.stubEnv(KEY, "k");
    const overrides = heliconeOpenAIOverrides("scripts-gpt") as {
      baseURL: string;
      defaultHeaders: Record<string, string>;
    };
    expect(overrides.baseURL).toBe(HELICONE_OPENAI_BASE_URL);
    expect(overrides.baseURL).toBe("https://oai.helicone.ai/v1");
    expect(overrides.defaultHeaders["Helicone-Property-Source"]).toBe(
      "scripts-gpt",
    );
    expect(overrides.defaultHeaders["Helicone-Async"]).toBe("true");
  });
});

describe("heliconeRequestHeaders", () => {
  it("is empty when Helicone is disabled, even with a userId", () => {
    expect(heliconeRequestHeaders("user-1")).toEqual({});
  });

  it("is empty when enabled but no userId is provided", () => {
    vi.stubEnv(KEY, "k");
    expect(heliconeRequestHeaders()).toEqual({});
    expect(heliconeRequestHeaders(undefined)).toEqual({});
  });

  it("carries Helicone-User-Id when enabled and a userId is provided", () => {
    vi.stubEnv(KEY, "k");
    expect(heliconeRequestHeaders("user-42")).toEqual({
      "Helicone-User-Id": "user-42",
    });
  });
});
