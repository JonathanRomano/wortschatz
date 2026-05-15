/**
 * Seed the database with the admin and teacher accounts.
 *
 *   npm run db:seed
 *
 * Idempotent — safe to re-run. Passwords are bcrypt-hashed.
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
