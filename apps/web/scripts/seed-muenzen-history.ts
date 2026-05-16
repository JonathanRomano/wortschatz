/**
 * Backfill MuenzenTransaction rows for users whose current `muenzen`
 * balance predates the transaction-log feature.
 *
 *   npm run db:seed-muenzen-history
 *
 * One-shot: safe to re-run, idempotent per user. Users who already have
 * at least one MuenzenTransaction are skipped (assumed coherent). Users
 * with a positive `muenzen` balance and zero transactions get a single
 * ADMIN_ADJUSTMENT row equal to their current balance so the history
 * page reconciles with the displayed total.
 */
import { PrismaClient } from "@wortschatz/database";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, muenzen: true },
  });

  let backfilled = 0;
  let alreadyCoherent = 0;
  let zeroBalance = 0;

  for (const user of users) {
    const existing = await prisma.muenzenTransaction.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    if (existing) {
      alreadyCoherent += 1;
      continue;
    }
    if (user.muenzen <= 0) {
      zeroBalance += 1;
      continue;
    }
    await prisma.muenzenTransaction.create({
      data: {
        userId: user.id,
        amount: user.muenzen,
        reason: "ADMIN_ADJUSTMENT",
        refId: "backfill: pre-history balance",
      },
    });
    backfilled += 1;
    console.log(
      `Backfilled ${user.muenzen} M for ${user.email ?? user.id}`,
    );
  }

  console.log("\n=== Summary ===");
  console.log(`Users scanned:        ${users.length}`);
  console.log(`Already coherent:     ${alreadyCoherent}`);
  console.log(`Zero balance, no tx:  ${zeroBalance}`);
  console.log(`Backfilled:           ${backfilled}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
