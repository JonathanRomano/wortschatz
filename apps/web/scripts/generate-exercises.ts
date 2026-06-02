/**
 * DEPRECATED (Exercise Generation v2): prefer `pnpm gen:claude` /
 * `pnpm gen:gpt` (scripts/{claude,gpt}/generate.ts), which use per-type
 * prompts and anti-duplication. This generic-prompt seeder is kept only
 * until a cleanup pass.
 *
 * Generate 5 exercises of each ExerciseType (50 total) and insert them
 * as PUBLISHED rows authored by the seed admin.
 *
 *   npm run db:generate-exercises
 *
 * Without an ANTHROPIC_API_KEY the generator falls back to deterministic
 * stub content (see src/lib/ai.ts). With the key set, generateExercise
 * makes real Claude calls — they go through the cache + usage log, and
 * since we pass `userId: undefined` this script bypasses per-user rate
 * limiting (it's an admin/system run).
 */
import type { CefrLevel, ExerciseType, Prisma } from "@wortschatz/database";
import { PrismaClient } from "@wortschatz/database";
import { generateExercise, AI_CONFIGURED } from "../src/lib/ai";

const prisma = new PrismaClient();
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const TYPES: ExerciseType[] = [
  "FILL_IN_THE_BLANK",
  "MULTIPLE_CHOICE",
  "TRANSLATION",
  "WORD_ORDER",
  "MATCHING",
  "LISTENING_COMPREHENSION",
  "READING_COMPREHENSION",
  "VERB_CONJUGATION",
  "ERROR_CORRECTION",
  "FREE_WRITING",
];

const TOPICS = ["food", "travel", "work", "family", "weather"];
const LEVELS: CefrLevel[] = ["A1", "A2", "B1"];

async function main() {
  console.log(
    `AI mode: ${AI_CONFIGURED ? "real" : "stub"} (model: ${MODEL})`,
  );

  const admin = await prisma.user.findUnique({
    where: { email: "admin@wortschatz.app" },
    select: { id: true },
  });
  if (!admin) {
    throw new Error("Run `npm run db:seed` first to create the admin user.");
  }

  let created = 0;
  for (const type of TYPES) {
    for (let i = 0; i < 5; i++) {
      const topic = TOPICS[i % TOPICS.length]!;
      const level = LEVELS[i % LEVELS.length]!;
      // Pass userId: undefined so per-user rate limiting is skipped;
      // usage rows are still recorded with userId = null.
      const ex = await generateExercise(type, level, topic, undefined);
      await prisma.exercise.create({
        data: {
          authorId: admin.id,
          type: ex.type,
          title: ex.title,
          targetLanguage: "de",
          level: ex.level,
          content: ex.content as Prisma.InputJsonValue,
          solution: ex.solution as Prisma.InputJsonValue,
          explanation: ex.explanation as Prisma.InputJsonValue,
          tags: ex.tags,
          status: "PUBLISHED",
          // Stub runs aren't a real model call — keep model = NULL for
          // those so the column stays a faithful audit of AI usage.
          model: AI_CONFIGURED ? MODEL : null,
          // Tip is best-effort from the generator. When absent we omit
          // the column entirely so the row's tip stays SQL NULL — that's
          // what the runner checks when deciding whether to render the
          // tip button.
          ...(ex.tip ? { tip: ex.tip as Prisma.InputJsonValue } : {}),
        },
      });
      created += 1;
    }
  }
  console.log(`Created ${created} exercises.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
