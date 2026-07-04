"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@wortschatz/database";
import { PROFESSION_SLUGS } from "@wortschatz/config";
import { SETUP_SEEN_COOKIE } from "@/lib/track/flags";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

// "" comes from "not sure yet" choices; normalize to null like the
// profile action does.
const optionalEnum = <T extends readonly string[]>(values: T) =>
  z
    .union([z.literal(""), z.enum(values as unknown as [T[number], ...T[number][]])])
    .transform((v) => (v === "" ? null : v));

const schema = z.object({
  // The whole point of the flow — required here, unlike on the profile.
  profession: z.enum(PROFESSION_SLUGS),
  learningLevel: optionalEnum(CEFR_LEVELS),
  targetLevel: optionalEnum(CEFR_LEVELS),
  dailyGoal: z.coerce
    .number()
    .int()
    .transform((n) => Math.max(1, Math.min(30, n))),
});

export type SetupResult = { ok: true } | { ok: false; error: string };

async function markSetupSeen() {
  const jar = await cookies();
  jar.set(SETUP_SEEN_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export async function completeSetup(formData: FormData): Promise<SetupResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };

  const parsed = schema.safeParse({
    profession: formData.get("profession"),
    learningLevel: formData.get("learningLevel") ?? "",
    targetLevel: formData.get("targetLevel") ?? "",
    dailyGoal: formData.get("dailyGoal") ?? 5,
  });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });
  await markSetupSeen();
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { ok: true };
}

/**
 * "I'm just learning for myself" — leaves `profession` NULL (the app
 * behaves exactly as pre-pivot) and only stamps the seen-cookie so the
 * dashboard stops redirecting this browser back here.
 */
export async function skipSetup(): Promise<SetupResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };
  await markSetupSeen();
  return { ok: true };
}
