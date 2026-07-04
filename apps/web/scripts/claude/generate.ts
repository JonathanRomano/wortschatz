/**
 * Claude exercise generator (v2). The shared runner in ../shared/run.ts
 * drives the per-item generate → insert loop; the per-type prompts live in
 * @wortschatz/exercises. See apps/web/scripts/README.md for usage.
 *
 *   pnpm gen:claude --type FILL_IN_THE_BLANK --level A2 --count 5 --topic food
 *   pnpm gen:claude --type MULTIPLE_CHOICE --level B1 --count 10 --dry-run
 *
 * Generation prefers the apps/api endpoint (POST /ai/generate-exercise) when
 * the API is reachable and INTERNAL_API_SECRET is set, which keeps the heavy
 * LLM work on the boundary-correct service. When the API isn't running it
 * falls back to the in-process Anthropic SDK so local iteration doesn't
 * require booting apps/api (Decision 3). The chosen path is logged.
 */
import { claudePrompts } from "@wortschatz/exercises";
import { prisma } from "@wortschatz/database";

import { parseArgs } from "../shared/cli";
import { runGeneration } from "../shared/run";
import { makeDirectGenerator, makeRemoteGenerator } from "../shared/generators";
import { isExpressReachable } from "../shared/express-health";
import { callClaude, CLAUDE_DEFAULT_MODEL } from "./client";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const useExpress =
    Boolean(process.env.INTERNAL_API_SECRET) && (await isExpressReachable());
  const generate = useExpress
    ? makeRemoteGenerator("claude")
    : makeDirectGenerator(callClaude, claudePrompts, "claude");
  console.log(
    useExpress
      ? "[gen:claude] using the apps/api /ai/generate-exercise endpoint"
      : "[gen:claude] apps/api unreachable — falling back to the in-process Anthropic SDK",
  );

  await runGeneration({
    providerLabel: "claude",
    generate,
    defaultModel: CLAUDE_DEFAULT_MODEL,
    request: {
      type: args.type,
      level: args.level,
      topic: args.topic,
      count: args.count,
      dryRun: args.dryRun,
      noRecent: args.noRecent,
      professionSlug: args.profession,
      unitSlug: args.unit,
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
