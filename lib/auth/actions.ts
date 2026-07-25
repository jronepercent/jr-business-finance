"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { categories, users } from "@/db/schema";
import { defaultCategories } from "@/lib/default-categories";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./session";

function normalizeEmail(raw: FormDataEntryValue | null) {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export async function signUp(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !email.includes("@")) {
    redirect(`/signup?error=${encodeURIComponent("อีเมลไม่ถูกต้อง")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")}`);
  }
  if (password !== confirmPassword) {
    redirect(`/signup?error=${encodeURIComponent("รหัสผ่านไม่ตรงกัน")}`);
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    redirect(`/signup?error=${encodeURIComponent("มีบัญชีนี้อยู่แล้ว")}`);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash }).returning();

  await db.insert(categories).values(
    defaultCategories.map((category) => ({
      userId: user.id,
      type: category.type,
      name: category.name,
      icon: category.icon,
    })),
  );

  await createSession(user.id, user.email);
  redirect("/");
}

export async function signIn(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/login?error=${encodeURIComponent("อีเมลหรือรหัสผ่านไม่ถูกต้อง")}`);
  }

  await createSession(user.id, user.email);
  redirect("/");
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
