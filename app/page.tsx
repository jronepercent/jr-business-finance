import { requireUser } from "@/lib/auth/session";
import { getBusinessesForUser, getCategoriesForUser, getTransactionsForUser } from "@/db/queries";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const [businesses, categories, transactions] = await Promise.all([
    getBusinessesForUser(user.id),
    getCategoriesForUser(user.id),
    getTransactionsForUser(user.id),
  ]);

  return <DashboardClient businesses={businesses} categories={categories} transactions={transactions} userEmail={user.email} />;
}
