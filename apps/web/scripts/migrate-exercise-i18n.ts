/**
 * Convert legacy plain-string `instructions` / `explanation` columns
 * into the new `{ en: "..." }` JSON shape, then ALTER the column type
 * to jsonb so `prisma db push` can proceed without `--force-reset`.
 *
 *   npm run db:migrate-exercise-i18n
 *
 * Idempotent: re-running on jsonb columns is a no-op.
 */
import { PrismaClient } from "@wortschatz/database";

const prisma = new PrismaClient();

async function columnType(column: string): Promise<string> {
  const rows = await prisma.$queryRaw<{ data_type: string }[]>`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'Exercise' AND column_name = ${column}
  `;
  return rows[0]?.data_type ?? "unknown";
}

async function migrateColumn(column: "instructions" | "explanation") {
  const type = await columnType(column);
  if (type === "jsonb") {
    console.log(`  ${column}: already jsonb, skipping`);
    return;
  }
  if (type !== "text") {
    console.log(`  ${column}: unexpected type ${type}, aborting`);
    return;
  }
  // Wrap each plain-string value into {"en": "..."} JSON text, then
  // ALTER the column to jsonb in one transaction.
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`
      UPDATE "Exercise"
      SET "${column}" = jsonb_build_object('en', "${column}")::text
      WHERE "${column}" IS NOT NULL
        AND (left("${column}", 1) <> '{' OR "${column}" IS NULL)
    `),
    prisma.$executeRawUnsafe(`
      ALTER TABLE "Exercise"
      ALTER COLUMN "${column}" TYPE jsonb
      USING "${column}"::jsonb
    `),
  ]);
  console.log(`  ${column}: migrated`);
}

async function main() {
  console.log("Migrating Exercise.instructions and .explanation to jsonb...");
  await migrateColumn("instructions");
  await migrateColumn("explanation");
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
