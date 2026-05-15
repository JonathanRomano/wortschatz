/**
 * Generate 5 exercises of each ExerciseType (50 total) and insert them
 * as PUBLISHED rows authored by the seed admin.
 *
 *   npm run db:generate-exercises
 *
 * Without an ANTHROPIC_API_KEY the generator falls back to deterministic
 * stub content (see src/lib/ai.ts). To use real Claude generation, set
 * ANTHROPIC_API_KEY and replace the TODO in src/lib/ai.ts:generateExercise.
 */
import type { CefrLevel, ExerciseType, Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { generateExercise, AI_CONFIGURED } from "../src/lib/ai";

const prisma = new PrismaClient();

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
const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];

async function main() {
  console.log(
    AI_CONFIGURED
      ? "ANTHROPIC_API_KEY detected — real AI generation should be wired in src/lib/ai.ts."
      : "No ANTHROPIC_API_KEY — generating deterministic stub exercises.",
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
      const ex = await generateExercise(type, level, topic);
      await prisma.exercise.create({
        data: {
          authorId: admin.id,
          type: ex.type,
          title: ex.title,
          instructions: ex.instructions as Prisma.InputJsonValue,
          targetLanguage: "de",
          level: ex.level,
          content: ex.content as Prisma.InputJsonValue,
          solution: ex.solution as Prisma.InputJsonValue,
          explanation: ex.explanation as Prisma.InputJsonValue,
          tags: ex.tags,
          status: "PUBLISHED",
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
