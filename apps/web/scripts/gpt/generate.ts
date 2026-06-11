/**
 * GPT exercise generator (v2). The shared runner in ../shared/run.ts drives
 * the per-item generate → insert loop; the per-type prompts live in
 * @wortschatz/exercises. See apps/web/scripts/README.md for usage.
 *
 *   pnpm gen:gpt --type MULTIPLE_CHOICE --level B1 --count 5
 *   pnpm gen:gpt --type TRANSLATION --level A2 --count 10 --dry-run
 *
 * Like gen:claude, this prefers the apps/api endpoint (POST
 * /ai/generate-exercise) when reachable and INTERNAL_API_SECRET is set, and
 * falls back to the in-process OpenAI SDK otherwise (Decision 3). The direct
 * fallback needs OPENAI_API_KEY in apps/web/.env; the remote path needs it on
 * apps/api instead.
 */
import { gptPrompts } from "@wortschatz/exercises";
import { prisma } from "@wortschatz/database";

import { parseArgs } from "../shared/cli";
import { runGeneration } from "../shared/run";
import { makeDirectGenerator, makeRemoteGenerator } from "../shared/generators";
import { isExpressReachable } from "../shared/express-health";
import { callGPT, GPT_DEFAULT_MODEL } from "./client";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const useExpress =
    Boolean(process.env.INTERNAL_API_SECRET) && (await isExpressReachable());
  const generate = useExpress
    ? makeRemoteGenerator("gpt")
    : makeDirectGenerator(callGPT, gptPrompts, "gpt");
  console.log(
    useExpress
      ? "[gen:gpt] using the apps/api /ai/generate-exercise endpoint"
      : "[gen:gpt] apps/api unreachable — falling back to the in-process OpenAI SDK",
  );

  await runGeneration({
    providerLabel: "gpt",
    generate,
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
