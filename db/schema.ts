import { relations } from "drizzle-orm";
import { integer, numeric, pgEnum, pgTable, text, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "cost",
  "expense",
  "owner_contribution",
  "owner_withdrawal",
  "transfer",
]);

export const statusEnum = pgEnum("status", ["received", "pending_receive", "paid", "pending_pay"]);

export const users = pgTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const businesses = pgTable("businesses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  status: statusEnum("status").notNull(),
  businessId: text("business_id").references(() => businesses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const allocations = pgTable("allocations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  transactionId: text("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  businessId: text("business_id")
    .notNull()
    .references(() => businesses.id),
  percent: numeric("percent", { precision: 6, scale: 3 }).notNull(),
});

export const transactionsRelations = relations(transactions, ({ many }) => ({
  allocations: many(allocations),
}));

export const allocationsRelations = relations(allocations, ({ one }) => ({
  transaction: one(transactions, {
    fields: [allocations.transactionId],
    references: [transactions.id],
  }),
}));
