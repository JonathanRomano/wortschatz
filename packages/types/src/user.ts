import type { CefrLevel, UserRole } from "@wortschatz/database";

export type { CefrLevel, UserRole };

/**
 * Shape of `session.user` produced by NextAuth in this app. Kept in
 * sync with the augmentation in apps/web/src/types/next-auth.d.ts —
 * defining it here lets apps/api reason about the same user object
 * when verifying the shared-secret header pair (X-API-Secret +
 * X-User-Id) without re-importing the NextAuth-only types.
 */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: UserRole;
  avatarUrl?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  nativeLanguage: string | null;
  learningLevel: CefrLevel | null;
  dailyGoal: number;
  avatarUrl: string | null;
}
