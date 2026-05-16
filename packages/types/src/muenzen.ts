import type { MuenzenReason } from "@wortschatz/database";

export type { MuenzenReason };

/**
 * Public-facing transaction shape used by the history UI and any API
 * response. Keep this in sync with the columns of MuenzenTransaction
 * that should be exposed to clients — id, internal flags, etc stay on
 * the Prisma row only.
 */
export interface MuenzenTransactionDTO {
  id: string;
  amount: number;
  reason: MuenzenReason;
  createdAt: string;
  exerciseId?: string | null;
  note?: string | null;
}
