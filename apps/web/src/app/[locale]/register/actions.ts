"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@wortschatz/database";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

export async function registerAction(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "errorGeneric" };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "errorAlreadyRegistered" };

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: hash, role: "USER" },
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });
  return null;
}
