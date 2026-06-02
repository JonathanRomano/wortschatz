/**
 * Claude exercise generator (v2). Per-type prompts live in ./prompts; the
 * shared runner in ../shared/run.ts drives the generate → validate →
 * insert loop. See apps/web/scripts/README.md for usage.
 *
 *   pnpm gen:claude --type FILL_IN_THE_BLANK --level A2 --count 5 --topic food
 *   pnpm gen:claude --type MULTIPLE_CHOICE --level B1 --count 10 --dry-run
 */
import { prisma } from "@wortschatz/database";

import { parseArgs } from "../shared/cli";
import { runGeneration } from "../shared/run";
import { callClaude, CLAUDE_DEFAULT_MODEL } from "./client";
import { claudePrompts } from "./prompts";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await runGeneration({
    providerLabel: "claude",
    client: callClaude,
    prompts: claudePrompts,
    defaultModel: CLAUDE_DEFAULT_MODEL,
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
