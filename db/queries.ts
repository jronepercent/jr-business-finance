import { and, asc, desc, eq, exists, ne, or, sql } from "drizzle-orm";
import { db } from "./client";
import { allocations, businesses, categories, transactions } from "./schema";
import type { Allocation, Business, Category, Status, Transaction, TransactionType } from "@/lib/types";

const BUSINESS_COLORS = ["#2563EB", "#16A34A", "#F97316", "#9333EA", "#0891B2"];

type TransactionRow = typeof transactions.$inferSelect;
type AllocationRow = typeof allocations.$inferSelect;

function mapTransactionRow(row: TransactionRow, allocationRows: AllocationRow[]): Transaction {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    title: row.title,
    category: row.category,
    amount: row.amount,
    status: row.status,
    businessId: row.businessId ?? undefined,
    allocations: allocationRows.length
      ? allocationRows.map((a) => ({ businessId: a.businessId, percent: Number(a.percent) }))
      : undefined,
  };
}

export type TransactionInput = {
  date: string;
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  status: Status;
  businessId?: string;
  allocations?: Allocation[];
};

export async function getBusinessesForUser(userId: string): Promise<Business[]> {
  const rows = await db.select().from(businesses).where(eq(businesses.userId, userId)).orderBy(asc(businesses.createdAt));
  return rows.map((row) => ({ id: row.id, name: row.name, color: row.color }));
}

export async function getCategoriesForUser(userId: string): Promise<Category[]> {
  const rows = await db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.createdAt));
  return rows.map((row) => ({ id: row.id, type: row.type, name: row.name, icon: row.icon }));
}

export async function getTransactionsForUser(userId: string): Promise<Transaction[]> {
  const rows = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    with: { allocations: true },
    orderBy: [desc(transactions.createdAt)],
  });
  return rows.map((row) => mapTransactionRow(row, row.allocations));
}

export async function createTransaction(userId: string, input: TransactionInput): Promise<Transaction> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(transactions)
      .values({
        userId,
        date: input.date,
        type: input.type,
        title: input.title,
        category: input.category,
        amount: input.amount,
        status: input.status,
        businessId: input.businessId ?? null,
      })
      .returning();

    let allocationRows: AllocationRow[] = [];
    if (input.allocations?.length) {
      allocationRows = await tx
        .insert(allocations)
        .values(input.allocations.map((a) => ({ transactionId: row.id, businessId: a.businessId, percent: a.percent.toString() })))
        .returning();
    }

    return mapTransactionRow(row, allocationRows);
  });
}

export async function updateTransaction(userId: string, id: string, input: TransactionInput): Promise<Transaction> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(transactions)
      .set({
        date: input.date,
        type: input.type,
        title: input.title,
        category: input.category,
        amount: input.amount,
        status: input.status,
        businessId: input.businessId ?? null,
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    if (!row) throw new Error("Transaction not found");

    await tx.delete(allocations).where(eq(allocations.transactionId, id));

    let allocationRows: AllocationRow[] = [];
    if (input.allocations?.length) {
      allocationRows = await tx
        .insert(allocations)
        .values(input.allocations.map((a) => ({ transactionId: id, businessId: a.businessId, percent: a.percent.toString() })))
        .returning();
    }

    return mapTransactionRow(row, allocationRows);
  });
}

export async function deleteTransaction(userId: string, id: string): Promise<void> {
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

export async function createBusiness(userId: string, name: string): Promise<Business> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businesses)
    .where(eq(businesses.userId, userId));
  const color = BUSINESS_COLORS[count % BUSINESS_COLORS.length];
  const [row] = await db.insert(businesses).values({ userId, name, color }).returning();
  return { id: row.id, name: row.name, color: row.color };
}

export async function updateBusiness(userId: string, id: string, name: string, color: string): Promise<Business> {
  const [row] = await db
    .update(businesses)
    .set({ name, color })
    .where(and(eq(businesses.id, id), eq(businesses.userId, userId)))
    .returning();
  if (!row) throw new Error("Business not found");
  return { id: row.id, name: row.name, color: row.color };
}

export async function deleteBusinessCascade(userId: string, businessId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(transactions).where(
      and(
        eq(transactions.userId, userId),
        or(
          eq(transactions.businessId, businessId),
          exists(
            tx
              .select()
              .from(allocations)
              .where(and(eq(allocations.transactionId, transactions.id), eq(allocations.businessId, businessId))),
          ),
        ),
      ),
    );
    await tx.delete(businesses).where(and(eq(businesses.id, businessId), eq(businesses.userId, userId)));
  });
}

export async function createCategory(userId: string, type: TransactionType, name: string, icon: string): Promise<Category> {
  const [row] = await db.insert(categories).values({ userId, type, name, icon }).returning();
  return { id: row.id, type: row.type, name: row.name, icon: row.icon };
}

export async function updateCategory(userId: string, id: string, name: string, icon: string): Promise<Category> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.categories.findFirst({
      where: and(eq(categories.id, id), eq(categories.userId, userId)),
    });
    if (!existing) throw new Error("Category not found");

    const [row] = await tx
      .update(categories)
      .set({ name, icon })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();

    if (existing.name !== name) {
      await tx
        .update(transactions)
        .set({ category: name })
        .where(and(eq(transactions.userId, userId), eq(transactions.category, existing.name)));
    }

    return { id: row.id, type: row.type, name: row.name, icon: row.icon };
  });
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.query.categories.findFirst({
      where: and(eq(categories.id, id), eq(categories.userId, userId)),
    });
    if (!existing) return;

    const fallback = await tx.query.categories.findFirst({
      where: and(eq(categories.userId, userId), eq(categories.type, existing.type), ne(categories.id, id)),
      orderBy: [asc(categories.createdAt)],
    });
    const fallbackName = fallback?.name ?? "";

    await tx
      .update(transactions)
      .set({ category: fallbackName })
      .where(and(eq(transactions.userId, userId), eq(transactions.category, existing.name)));
    await tx.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
  });
}
