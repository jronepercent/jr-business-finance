"use server";

import { requireUser } from "@/lib/auth/session";
import * as queries from "@/db/queries";
import type { Transaction, TransactionType } from "@/lib/types";
import type { TransactionInput } from "@/db/queries";

function validateTransactionInput(input: TransactionInput) {
  const hasBusiness = Boolean(input.businessId);
  const hasAllocations = Boolean(input.allocations?.length);
  if (hasBusiness === hasAllocations) {
    throw new Error("ต้องระบุธุรกิจเดียว หรือแบ่งสัดส่วนหลายธุรกิจ อย่างใดอย่างหนึ่ง");
  }
}

export async function createTransactionAction(input: TransactionInput): Promise<Transaction> {
  const user = await requireUser();
  validateTransactionInput(input);
  return queries.createTransaction(user.id, input);
}

export async function updateTransactionAction(id: string, input: TransactionInput): Promise<Transaction> {
  const user = await requireUser();
  validateTransactionInput(input);
  return queries.updateTransaction(user.id, id, input);
}

export async function deleteTransactionAction(id: string): Promise<void> {
  const user = await requireUser();
  await queries.deleteTransaction(user.id, id);
}

export async function createBusinessAction(name: string) {
  const user = await requireUser();
  return queries.createBusiness(user.id, name);
}

export async function updateBusinessAction(id: string, name: string, color: string) {
  const user = await requireUser();
  return queries.updateBusiness(user.id, id, name, color);
}

export async function deleteBusinessAction(id: string): Promise<void> {
  const user = await requireUser();
  await queries.deleteBusinessCascade(user.id, id);
}

export async function createCategoryAction(type: TransactionType, name: string, icon: string) {
  const user = await requireUser();
  return queries.createCategory(user.id, type, name, icon);
}

export async function updateCategoryAction(id: string, name: string, icon: string) {
  const user = await requireUser();
  return queries.updateCategory(user.id, id, name, icon);
}

export async function deleteCategoryAction(id: string): Promise<void> {
  const user = await requireUser();
  await queries.deleteCategory(user.id, id);
}
