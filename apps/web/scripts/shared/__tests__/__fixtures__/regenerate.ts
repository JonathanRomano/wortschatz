/**
 * Regenerates prompt-baseline.json — the fixture the parity test
 * (../prompt-parity.test.ts) pins every per-type prompt against.
 *
 * Run this ONLY after an INTENTIONAL prompt edit; it recaptures the
 * composed {system, user, maxTokens} for every type + branch so the parity
 * test reflects the new expected output. Unintentional drift should fail
 * the parity test, not be papered over by regenerating.
 *
 *   set -a && . ./.env && set +a && \
 *   pnpm --filter @wortschatz/web exec tsx \
 *     scripts/shared/__tests__/__fixtures__/regenerate.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildPrompt,
  claudePrompts,
  gptPrompts,
  type PromptInput,
  type PromptRegistry,
} from "@wortschatz/exercises";

const LEVEL: PromptInput["level"] = "A2";
const TOPIC = "Im Restaurant";
const RECENT: PromptInput["recentExamples"] = [
  { title: "Beispiel A", excerpt: "Ich gehe gern in die Schule." },
  { title: "Beispiel B", excerpt: "Wir haben gestern gegessen." },
];

function capture(registry: PromptRegistry) {
  const out: Record<string, unknown> = {};
  for (const type of Object.keys(registry).sort()) {
    const parts = registry[type as keyof PromptRegistry];
    out[type] = {
      withRecent: buildPrompt(parts, { level: LEVEL, topic: TOPIC, recentExamples: RECENT }),
      noRecent: buildPrompt(parts, { level: LEVEL, topic: TOPIC, recentExamples: [] }),
    };
  }
  return out;
}

const baseline = {
  meta: { level: LEVEL, topic: TOPIC, recent: RECENT },
  claude: capture(claudePrompts),
  gpt: capture(gptPrompts),
};

const outPath = join(__dirname, "prompt-baseline.json");
writeFileSync(outPath, JSON.stringify(baseline, null, 2) + "\n", "utf8");
console.log(`Wrote ${outPath}`);
