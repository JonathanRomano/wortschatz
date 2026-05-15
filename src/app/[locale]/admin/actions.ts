"use server";

import { revalidatePath } from "next/cache";
import type { ExerciseStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function setExerciseStatus(id: string, status: ExerciseStatus) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "TEACHER") {
    throw new Error("Forbidden");
  }
  await prisma.exercise.update({ where: { id }, data: { status } });
  revalidatePath("/admin");
  revalidatePath("/exercises");
}
