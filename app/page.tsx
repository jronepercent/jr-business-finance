import { requireUser } from "@/lib/auth/session";
import { getBusinessesForUser, getCategoriesForUser, getTransactionsForUser } from "@/db/queries";
import DashboardClient from "./dashboard-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  let businesses;
  let categories;
  let transactions;

  try {
    [businesses, categories, transactions] = await Promise.all([
      getBusinessesForUser(user.id),
      getCategoriesForUser(user.id),
      getTransactionsForUser(user.id),
    ]);
  } catch (error) {
    console.error("Dashboard data load failed", error);
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand">
            <div className="brand-mark">PL</div>
            <div>
              <strong>ProfitLens</strong>
              <span>กำไรจริงและเงินสดจริง</span>
            </div>
          </div>
          <h1>โหลดข้อมูลธุรกิจไม่ได้</h1>
          <p className="auth-error">เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจค่า DIRECT_URL / DATABASE_URL แล้วลองใหม่</p>
          <Link className="primary-button full" href="/">
            โหลดใหม่
          </Link>
        </section>
      </main>
    );
  }

  return <DashboardClient businesses={businesses} categories={categories} transactions={transactions} userEmail={user.email} />;
}
