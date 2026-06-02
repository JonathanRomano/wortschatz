/**
 * GPT exercise generator (v2). Per-type prompts live in ./prompts; the
 * shared runner in ../shared/run.ts drives the generate → validate →
 * insert loop. Requires OPENAI_API_KEY in apps/web/.env. See
 * apps/web/scripts/README.md for usage.
 *
 *   pnpm gen:gpt --type MULTIPLE_CHOICE --level B1 --count 5
 *   pnpm gen:gpt --type TRANSLATION --level A2 --count 10 --dry-run
 */
import { prisma } from "@wortschatz/database";

import { parseArgs } from "../shared/cli";
import { runGeneration } from "../shared/run";
import { callGPT, GPT_DEFAULT_MODEL } from "./client";
import { gptPrompts } from "./prompts";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await runGeneration({
    providerLabel: "gpt",
    client: callGPT,
    prompts: gptPrompts,
    defaultModel: GPT_DEFAULT_MODEL,
    request: {
      type: args.type,
      level: args.level,
      topic: args.topic,
      count: args.count,
      dryRun: args.dryRun,
      noRecent: args.noRecent,
    },
    model: args.model,
    delayMs: args.delayMs,
    verbose: args.verbose,
    onProgress: (line) => console.log(line),
  });
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
