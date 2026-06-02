/**
 * CLI-parity guard for the prompt-builder refactor.
 *
 * `prompt-baseline.json` was captured from the legacy monolithic prompts
 * BEFORE the four-part split. This test reassembles every per-type prompt
 * (both providers, both recent/no-recent branches) through the new
 * buildPrompt() and asserts it reproduces the baseline byte-for-byte. If a
 * future prompt edit is intentional, regenerate the baseline; an
 * unintentional drift fails here, proving the CLI still sends the exact
 * same prompts it did before the refactor.
 */
import { describe, expect, it, vi } from "vitest";

// renderRecentBlock is pure, but its module imports the prisma singleton;
// stub the package so no PrismaClient is constructed under vitest.
vi.mock("@wortschatz/database", () => ({ prisma: {} }));

import baseline from "./__fixtures__/prompt-baseline.json";
import { buildPrompt } from "../prompt-builder";
import { claudePrompts } from "../../claude/prompts";
import { gptPrompts } from "../../gpt/prompts";
import type { PromptInput, PromptRegistry } from "../types";

type Snapshot = { system: string; user: string; maxTokens: number };
type Branch = { withRecent: Snapshot; noRecent: Snapshot };

const typed = baseline as unknown as {
  meta: { level: PromptInput["level"]; topic: string; recent: PromptInput["recentExamples"] };
  claude: Record<string, Branch>;
  gpt: Record<string, Branch>;
};
const meta = typed.meta;

const providers: Array<{ name: string; registry: PromptRegistry; data: Record<string, Branch> }> = [
  { name: "claude", registry: claudePrompts, data: typed.claude },
  { name: "gpt", registry: gptPrompts, data: typed.gpt },
];

for (const { name: provider, registry, data } of providers) {
  describe(`${provider} prompt parity`, () => {
    for (const [type, branches] of Object.entries(data)) {
      const parts = registry[type as keyof PromptRegistry];

      it(`${type} — with recent examples`, () => {
        const out = buildPrompt(parts, {
          level: meta.level,
          topic: meta.topic,
          recentExamples: meta.recent,
        });
        expect(out).toEqual(branches.withRecent);
      });

      it(`${type} — no recent examples`, () => {
        const out = buildPrompt(parts, {
          level: meta.level,
          topic: meta.topic,
          recentExamples: [],
        });
        expect(out).toEqual(branches.noRecent);
      });
    }
  });
}
