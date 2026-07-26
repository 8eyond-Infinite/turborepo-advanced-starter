"use server";

import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { clearSession, setSession } from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/me");

  // Trình duyệt gửi form về chính Next.js; chỉ server này nói chuyện với API.
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  const tokens = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  await setSession(tokens);
  redirect(next.startsWith("/") ? next : "/me");
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/");
}
