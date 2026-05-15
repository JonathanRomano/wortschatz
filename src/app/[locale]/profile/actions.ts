"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(120),
  preferredLanguage: z.enum(["EN", "PT", "TR", "UK"]),
});

export async function saveProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;
  const parsed = schema.safeParse({
    name: formData.get("name"),
    preferredLanguage: formData.get("preferredLanguage"),
  });
  if (!parsed.success) return;
  await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });
  revalidatePath("/profile");
}
