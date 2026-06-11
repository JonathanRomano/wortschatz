/**
 * Seed the database with the admin and teacher accounts.
 *
 *   pnpm db:seed                       # from repo root
 *   pnpm --filter @wortschatz/database seed
 *
 * Idempotent — safe to re-run. Passwords are bcrypt-hashed.
 *
 * Imports PrismaClient directly from @prisma/client rather than via
 * @wortschatz/database to avoid a package-self-reference (seed.ts lives
 * inside the database package). And uses a fresh client instead of the
 * exported singleton because seed is a one-shot script — we want a
 * connection we explicitly $disconnect at the end.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import { BASE_PROMPT_SEED } from "./seed-data/base-prompts";

const prisma = new PrismaClient();

async function upsertUser(opts: {
  email: string;
  name: string;
  password: string;
  role: "ADMIN" | "TEACHER";
}) {
  const hash = await bcrypt.hash(opts.password, 10);
  return prisma.user.upsert({
    where: { email: opts.email },
    update: { name: opts.name, role: opts.role, password: hash },
    create: {
      email: opts.email,
      name: opts.name,
      role: opts.role,
      password: hash,
    },
  });
}

/**
 * Seed the 40 base prompts (10 types × A1/A2/B1/B2) and their v1 ACTIVE
 * versions from the authored per-level content. Idempotent (Task 1.3):
 *
 *  - BasePrompt is upserted on its (type, level) unique key.
 *  - v1 is upserted on (basePromptId, versionNumber=1); `update: {}` means a
 *    re-seed never clobbers content edited in production, and never creates a
 *    duplicate v1. If a later version was published (v1 → INACTIVE), re-seeding
 *    leaves v1 exactly as it is — it does NOT resurrect it to ACTIVE.
 *
 * Authored by the seed admin (the established "system" author). The hardcoded
 * per-type prompt files remain the runtime fallback when no DB row exists
 * (Decision 5), so truncating these tables is always recoverable.
 */
async function seedBasePrompts(adminId: string): Promise<void> {
  let created = 0;
  for (const entry of BASE_PROMPT_SEED) {
    const basePrompt = await prisma.basePrompt.upsert({
      where: { type_level: { type: entry.type, level: entry.level } },
      update: {},
      create: { type: entry.type, level: entry.level },
    });

    const existing = await prisma.basePromptVersion.findUnique({
      where: {
        basePromptId_versionNumber: {
          basePromptId: basePrompt.id,
          versionNumber: 1,
        },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.basePromptVersion.create({
      data: {
        basePromptId: basePrompt.id,
        versionNumber: 1,
        status: "ACTIVE",
        systemPrompt: entry.systemPrompt,
        userInstructions: entry.userInstructions,
        changeNote: "Seed v1 — initial per-level content.",
        authorId: adminId,
        publishedAt: new Date(),
      },
    });
    created += 1;
  }
  console.log(
    `Base prompts: ${BASE_PROMPT_SEED.length} (type, level) rows; ` +
      `${created} new v1 versions created, ${BASE_PROMPT_SEED.length - created} already present.`,
  );
}

async function main() {
  const admin = await upsertUser({
    email: "admin@wortschatz.app",
    name: "Wortschatz Admin",
    password: "admin123",
    role: "ADMIN",
  });
  const teacher = await upsertUser({
    email: "teacher@wortschatz.app",
    name: "Frau Lehrerin",
    password: "teacher123",
    role: "TEACHER",
  });
  console.log("Seeded users:", { admin: admin.email, teacher: teacher.email });

  await seedBasePrompts(admin.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
