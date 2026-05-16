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
  console.log("Seeded:", { admin: admin.email, teacher: teacher.email });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
