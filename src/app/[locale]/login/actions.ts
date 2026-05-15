"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function signInWithCredentials(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return null;
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.type === "CredentialsSignin") return { error: "errorInvalidCredentials" };
      return { error: "errorGeneric" };
    }
    throw err;
  }
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}
