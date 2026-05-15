"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Native-language allow-list. We don't reuse `UiLanguage` because (a)
// `UiLanguage` is uppercase + the UI-supported locales only, while
// `nativeLanguage` is ISO 639-1 lowercase and includes "de" (a learner
// whose native tongue is German is rare but plausible — heritage
// speaker brushing up).
const NATIVE_LANGUAGES = ["pt", "en", "tr", "uk", "de"] as const;

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

// "" comes from the placeholder <MenuItem value="">…</MenuItem> entries
// in the form; we normalize that to `null` before hitting the DB.
const optionalEnum = <T extends readonly string[]>(values: T) =>
  z
    .union([z.literal(""), z.enum(values as unknown as [T[number], ...T[number][]])])
    .transform((v) => (v === "" ? null : v));

const schema = z.object({
  name: z.string().min(1).max(120).trim(),
  preferredLanguage: z.enum(["EN", "PT", "TR", "UK"]),
  // `bio` is optional. Trim before length-check so leading whitespace
  // doesn't exhaust the budget. Empty strings collapse to null so the
  // DB doesn't grow stale empty rows.
  bio: z
    .string()
    .trim()
    .max(280)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  nativeLanguage: optionalEnum(NATIVE_LANGUAGES),
  learningLevel: optionalEnum(CEFR_LEVELS),
  // Slider posts a string; coerce, then clamp. We clamp rather than
  // reject because the slider widget can't produce out-of-range values
  // under normal use — clamping is defense in depth, not the primary UX.
  dailyGoal: z.coerce
    .number()
    .int()
    .transform((n) => Math.max(1, Math.min(30, n))),
});

export type SaveProfileResult = { ok: true } | { ok: false; error: string };

export async function saveProfile(
  formData: FormData,
): Promise<SaveProfileResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "not_authenticated" };
  const parsed = schema.safeParse({
    name: formData.get("name"),
    preferredLanguage: formData.get("preferredLanguage"),
    bio: formData.get("bio") ?? undefined,
    nativeLanguage: formData.get("nativeLanguage") ?? "",
    learningLevel: formData.get("learningLevel") ?? "",
    dailyGoal: formData.get("dailyGoal") ?? 5,
  });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
