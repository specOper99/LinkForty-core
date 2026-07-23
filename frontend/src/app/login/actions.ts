"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";

function clientIpFromHeaders(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") || "unknown";
}

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "Username and password required" };
  }

  const h = await headers();
  const clientIp = clientIpFromHeaders(h);

  try {
    await signIn("credentials", {
      username,
      password,
      clientIp,
      redirectTo: "/",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.message.includes("Too many login attempts")) {
        return { error: err.message };
      }
      return { error: "Invalid credentials" };
    }
    // Next.js redirect() throws; rethrow
    throw err;
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
