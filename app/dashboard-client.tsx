"use client";

import { CSSProperties, FormEvent, useMemo, useState, useTransition } from "react";
import { categoryOptions } from "@/lib/default-categories";
import type { Allocation, Business, Category, Status, Transaction, TransactionType } from "@/lib/types";
import { signOut } from "@/lib/auth/actions";
import {
  createBusinessAction,
  createCategoryAction,
  createTransactionAction,
  deleteBusinessAction,
  deleteCategoryAction,
  deleteTransactionAction,
  updateBusinessAction,
  updateCategoryAction,
  updateTransactionAction,
} from "@/app/actions";

type BusinessSummary = {
  business: Business;
  income: number;
  cost: number;
  expense: number;
  grossProfit: number;
  realProfit: number;
  margin: number;
  cash: number;
  receivable: number;
  payable: number;
};

type FormState = {
  id?: string;
  date: string;
  type: TransactionType;
  title: string;
  category: string;
  amount: string;
  status: Status;
  businessId: string;
  isShared: boolean;
  allocations: Record<string, string>;
};

type TransactionInput = {
  date: string;
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  status: Status;
  businessId?: string;
  allocations?: Allocation[];
};

const typeLabels: Record<TransactionType, string> = {
  income: "เงินเข้า",
  cost: "ต้นทุน",
  expense: "เงินออก",
  owner_contribution: "เจ้าของเติมเงิน",
  owner_withdrawal: "เจ้าของถอนเงิน",
  transfer: "โอนย้าย",
};

const statusLabels: Record<Status, string> = {
  received: "รับแล้ว",
  pending_receive: "ยังไม่ได้เงิน",
  paid: "จ่ายแล้ว",
  pending_pay: "ยังไม่จ่าย",
};

function firstCategoryName(categories: Category[], type: TransactionType) {
  return categories.find((category) => category.type === type)?.name ?? categoryOptions[type][0] ?? "";
}

const emptyForm = (businesses: Business[], categories: Category[] = []): FormState => ({
  date: todayISO(),
  type: "income",
  title: "",
  category: firstCategoryName(categories, "income"),
  amount: "",
  status: "received",
  businessId: businesses[0]?.id ?? "",
  isShared: false,
  allocations: Object.fromEntries(businesses.map((business, index) => [business.id, index === 0 ? "100" : "0"])),
});

function currency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTransactionShares(transaction: Transaction, businesses: Business[]) {
  if (transaction.allocations?.length) {
    return transaction.allocations.filter((allocation) => allocation.percent > 0);
  }
  if (transaction.businessId) {
    return [{ businessId: transaction.businessId, percent: 100 }];
  }
  return businesses.map((business) => ({ businessId: business.id, percent: 100 / businesses.length }));
}

function buildSummaries(businesses: Business[], transactions: Transaction[]): BusinessSummary[] {
  return businesses.map((business) => {
    const totals = {
      income: 0,
      cost: 0,
      expense: 0,
      ownerIn: 0,
      ownerOut: 0,
      cashIncome: 0,
      cashCost: 0,
      cashExpense: 0,
      receivable: 0,
      payable: 0,
    };

    transactions.forEach((transaction) => {
      const share = getTransactionShares(transaction, businesses).find((item) => item.businessId === business.id);
      if (!share) return;

      const amount = transaction.amount * (share.percent / 100);
      if (transaction.type === "income") {
        totals.income += amount;
        if (transaction.status === "received") totals.cashIncome += amount;
        if (transaction.status === "pending_receive") totals.receivable += amount;
      }
      if (transaction.type === "cost") {
        totals.cost += amount;
        if (transaction.status === "paid") totals.cashCost += amount;
        if (transaction.status === "pending_pay") totals.payable += amount;
      }
      if (transaction.type === "expense") {
        totals.expense += amount;
        if (transaction.status === "paid") totals.cashExpense += amount;
        if (transaction.status === "pending_pay") totals.payable += amount;
      }
      if (transaction.type === "owner_contribution") totals.ownerIn += amount;
      if (transaction.type === "owner_withdrawal") totals.ownerOut += amount;
    });

    const grossProfit = totals.income - totals.cost;
    const realProfit = grossProfit - totals.expense;
    const cash = totals.cashIncome - totals.cashCost - totals.cashExpense + totals.ownerIn - totals.ownerOut;

    return {
      business,
      income: totals.income,
      cost: totals.cost,
      expense: totals.expense,
      grossProfit,
      realProfit,
      margin: totals.income ? (realProfit / totals.income) * 100 : 0,
      cash,
      receivable: totals.receivable,
      payable: totals.payable,
    };
  });
}

export default function DashboardClient({
  businesses: initialBusinesses,
  categories: initialCategories,
  transactions: initialTransactions,
  userEmail,
}: {
  businesses: Business[];
  categories: Category[];
  transactions: Transaction[];
  userEmail: string;
}) {
  const [activeView, setActiveView] = useState("overview");
  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedBusiness, setSelectedBusiness] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(initialBusinesses, initialCategories));
  const [newBusinessName, setNewBusinessName] = useState("");
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ type: "income" as TransactionType, name: "", icon: "↗" });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const monthMatch = monthKey(transaction.date) === selectedMonth;
      const businessMatch =
        selectedBusiness === "all" ||
        transaction.businessId === selectedBusiness ||
        transaction.allocations?.some((allocation) => allocation.businessId === selectedBusiness);
      if (!monthMatch || !businessMatch) return false;
      if (!query) return true;

      const relatedBusinessNames = transaction.allocations?.length
        ? transaction.allocations.map((allocation) => businesses.find((business) => business.id === allocation.businessId)?.name ?? "").join(" ")
        : (businesses.find((business) => business.id === transaction.businessId)?.name ?? "");
      const haystack = `${transaction.title} ${transaction.category} ${relatedBusinessNames}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [transactions, selectedMonth, selectedBusiness, searchQuery, businesses]);

  const pendingNotifications = useMemo(
    () =>
      [...transactions]
        .filter((transaction) => transaction.status === "pending_receive" || transaction.status === "pending_pay")
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions],
  );
  const categoriesByType = useMemo(() => {
    return categories.reduce(
      (grouped, category) => {
        grouped[category.type].push(category);
        return grouped;
      },
      {
        income: [],
        cost: [],
        expense: [],
        owner_contribution: [],
        owner_withdrawal: [],
        transfer: [],
      } as Record<TransactionType, Category[]>,
    );
  }, [categories]);

  const summaries = useMemo(() => buildSummaries(businesses, filteredTransactions), [businesses, filteredTransactions]);
  const visibleSummaries = selectedBusiness === "all" ? summaries : summaries.filter((item) => item.business.id === selectedBusiness);
  const total = visibleSummaries.reduce(
    (sum, item) => ({
      income: sum.income + item.income,
      cost: sum.cost + item.cost,
      expense: sum.expense + item.expense,
      grossProfit: sum.grossProfit + item.grossProfit,
      realProfit: sum.realProfit + item.realProfit,
      cash: sum.cash + item.cash,
      receivable: sum.receivable + item.receivable,
      payable: sum.payable + item.payable,
    }),
    { income: 0, cost: 0, expense: 0, grossProfit: 0, realProfit: 0, cash: 0, receivable: 0, payable: 0 },
  );

  const margin = total.income ? (total.realProfit / total.income) * 100 : 0;
  const topExpense = useMemo(() => {
    const categoryTotals = new Map<string, number>();
    filteredTransactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + transaction.amount));
    return [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [filteredTransactions]);

  const insights = [
    visibleSummaries.length > 1
      ? `${[...visibleSummaries].sort((a, b) => b.realProfit - a.realProfit)[0]?.business.name} ทำกำไรจริงสูงสุดในเดือนนี้`
      : `Margin เดือนนี้อยู่ที่ ${margin.toFixed(1)}%`,
    topExpense ? `${topExpense[0]} เป็นเงินออกสูงสุด ${currency(topExpense[1])}` : "ยังไม่มีเงินออกในเดือนนี้",
    total.receivable > 0 ? `มีเงินค้างรับรวม ${currency(total.receivable)}` : "ไม่มีเงินค้างรับในเดือนนี้",
  ];

  function openCreateTransaction(type: TransactionType = "income", status?: Status) {
    if (businesses.length === 0) {
      setActiveView("businesses");
      return;
    }

    const next = emptyForm(businesses, categories);
    next.type = type;
    next.category = firstCategoryName(categories, type);
    next.status = status ?? (type === "income" || type === "owner_contribution" ? "received" : "paid");
    setForm(next);
    setIsTransactionOpen(true);
  }

  function openEditTransaction(transaction: Transaction) {
    setForm({
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      title: transaction.title,
      category: transaction.category,
      amount: String(transaction.amount),
      status: transaction.status,
      businessId: transaction.businessId ?? businesses[0]?.id ?? "",
      isShared: Boolean(transaction.allocations?.length),
      allocations: Object.fromEntries(
        businesses.map((business) => [
          business.id,
          String(transaction.allocations?.find((item) => item.businessId === business.id)?.percent ?? (transaction.businessId === business.id ? 100 : 0)),
        ]),
      ),
    });
    setIsTransactionOpen(true);
  }

  function saveTransaction(event: FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!amount || !form.title.trim()) return;

    const allocationEntries = Object.entries(form.allocations)
      .map(([businessId, percent]) => ({ businessId, percent: Number(percent) || 0 }))
      .filter((allocation) => allocation.percent > 0);
    const percentTotal = allocationEntries.reduce((sum, item) => sum + item.percent, 0);

    const payload: TransactionInput = {
      date: form.date,
      type: form.type,
      title: form.title.trim(),
      category: form.category,
      amount,
      status: form.status,
      businessId: form.isShared ? undefined : form.businessId,
      allocations: form.isShared ? allocationEntries.map((item) => ({ ...item, percent: (item.percent / percentTotal) * 100 })) : undefined,
    };

    const transactionId = form.id;
    setIsTransactionOpen(false);
    setPendingError(null);
    startTransition(async () => {
      try {
        const saved = transactionId ? await updateTransactionAction(transactionId, payload) : await createTransactionAction(payload);
        setTransactions((items) => (transactionId ? items.map((item) => (item.id === transactionId ? saved : item)) : [saved, ...items]));
      } catch {
        setPendingError("บันทึกรายการไม่สำเร็จ กรุณาลองใหม่");
      }
    });
  }

  function deleteTransactionHandler(id: string) {
    setTransactions((items) => items.filter((item) => item.id !== id));
    setPendingError(null);
    startTransition(async () => {
      try {
        await deleteTransactionAction(id);
      } catch {
        setPendingError("ลบรายการไม่สำเร็จ กรุณาโหลดหน้าใหม่");
      }
    });
  }

  function addBusiness(event: FormEvent) {
    event.preventDefault();
    const name = newBusinessName.trim();
    if (!name) return;
    setNewBusinessName("");
    setPendingError(null);
    startTransition(async () => {
      try {
        const business = await createBusinessAction(name);
        setBusinesses((items) => [...items, business]);
        setForm((current) => ({ ...current, allocations: { ...current.allocations, [business.id]: "0" } }));
      } catch {
        setPendingError("เพิ่มธุรกิจไม่สำเร็จ กรุณาลองใหม่");
      }
    });
  }

  function updateBusiness(id: string, name: string, color: string) {
    setEditingBusinessId(null);
    setPendingError(null);
    startTransition(async () => {
      try {
        const business = await updateBusinessAction(id, name, color);
        setBusinesses((items) => items.map((item) => (item.id === id ? business : item)));
      } catch {
        setPendingError("แก้ไขธุรกิจไม่สำเร็จ กรุณาลองใหม่");
      }
    });
  }

  function deleteBusiness(id: string) {
    setBusinesses((items) => items.filter((item) => item.id !== id));
    setTransactions((items) => items.filter((item) => item.businessId !== id && !item.allocations?.some((allocation) => allocation.businessId === id)));
    setPendingError(null);
    startTransition(async () => {
      try {
        await deleteBusinessAction(id);
      } catch {
        setPendingError("ลบธุรกิจไม่สำเร็จ กรุณาโหลดหน้าใหม่");
      }
    });
  }

  function addCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategory.name.trim();
    const icon = newCategory.icon.trim() || "•";
    if (!name) return;
    const type = newCategory.type;
    setNewCategory((current) => ({ ...current, name: "" }));
    setPendingError(null);
    startTransition(async () => {
      try {
        const category = await createCategoryAction(type, name, icon);
        setCategories((items) => [...items, category]);
      } catch {
        setPendingError("เพิ่มหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่");
      }
    });
  }

  function updateCategory(id: string, name: string, icon: string) {
    const nextName = name.trim();
    if (!nextName) return;
    const nextIcon = icon.trim() || "•";
    const previous = categories.find((category) => category.id === id);
    setCategories((items) => items.map((item) => (item.id === id ? { ...item, name: nextName, icon: nextIcon } : item)));
    setTransactions((items) => items.map((item) => (previous && item.category === previous.name ? { ...item, category: nextName } : item)));
    setEditingCategoryId(null);
    setPendingError(null);
    startTransition(async () => {
      try {
        await updateCategoryAction(id, nextName, nextIcon);
      } catch {
        setPendingError("แก้ไขหมวดหมู่ไม่สำเร็จ กรุณาโหลดหน้าใหม่");
      }
    });
  }

  function deleteCategory(id: string) {
    const category = categories.find((item) => item.id === id);
    if (!category) return;
    const fallback = categories.find((item) => item.type === category.type && item.id !== id)?.name ?? "";
    setCategories((items) => items.filter((item) => item.id !== id));
    setTransactions((items) => items.map((item) => (item.category === category.name ? { ...item, category: fallback } : item)));
    setForm((current) => (current.category === category.name ? { ...current, category: fallback } : current));
    setPendingError(null);
    startTransition(async () => {
      try {
        await deleteCategoryAction(id);
      } catch {
        setPendingError("ลบหมวดหมู่ไม่สำเร็จ กรุณาโหลดหน้าใหม่");
      }
    });
  }

  const navItems = [
    { id: "overview", label: "Dashboard", icon: "▦" },
    { id: "accounts", label: "Accounts", icon: "♙" },
    { id: "transactions", label: "Transactions", icon: "⇄", badge: transactions.length },
    { id: "cashflow", label: "Cash flow", icon: "▱" },
    { id: "budget", label: "Budget", icon: "♧" },
    { id: "investments", label: "Investments", icon: "▣" },
    { id: "categories", label: "หมวดหมู่", icon: "◫" },
    { id: "businesses", label: "ธุรกิจ", icon: "●" },
    { id: "learning", label: "Learning center", icon: "□" },
    { id: "support", label: "Support", icon: "♧" },
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PL</div>
          <div>
            <strong>ProfitLens</strong>
            <span>กำไรจริงและเงินสดจริง</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <div className="nav-group" key={item.id}>
              <button className={activeView === item.id ? "nav-item active" : "nav-item"} onClick={() => setActiveView(item.id)}>
                <span>{item.icon}</span>
                {item.label}
                {"badge" in item && <b>{item.badge}</b>}
              </button>
              {item.id === "transactions" && (
                <div className="nav-submenu">
                  <button
                    aria-current={activeView === "transactions" ? "page" : undefined}
                    className={activeView === "transactions" ? "active" : ""}
                    type="button"
                    onClick={() => setActiveView("transactions")}
                  >
                    History <b>{transactions.length}</b>
                  </button>
                  <button
                    aria-current={activeView === "accounts" ? "page" : undefined}
                    className={activeView === "accounts" ? "active" : ""}
                    type="button"
                    onClick={() => setActiveView("accounts")}
                  >
                    Integration
                  </button>
                  <button
                    aria-current={activeView === "reports" ? "page" : undefined}
                    className={activeView === "reports" ? "active" : ""}
                    type="button"
                    onClick={() => setActiveView("reports")}
                  >
                    Reports
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-email">{userEmail}</span>
          <form action={signOut}>
            <button type="submit" className="sidebar-logout">ออกจากระบบ</button>
          </form>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">กรกฎาคม 2026</p>
            <h1>{activeView === "overview" ? "เดือนนี้ธุรกิจเป็นอย่างไร" : navItems.find((item) => item.id === activeView)?.label}</h1>
          </div>
          <label className="search-box">
            <span>⌕</span>
            <input
              aria-label="ค้นหาเร็ว"
              placeholder="ค้นหารายการ ธุรกิจ หรือหมวด"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <div className="filters">
            <input aria-label="เลือกเดือน" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            <select aria-label="เลือกธุรกิจ" value={selectedBusiness} onChange={(event) => setSelectedBusiness(event.target.value)}>
              <option value="all">ทุกธุรกิจ</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
            <button className="primary-button" onClick={() => openCreateTransaction()}>
              <span>＋</span> เพิ่มรายการ
            </button>
            <div className="notification-wrap">
              <button className="icon-pill" aria-label="แจ้งเตือน" type="button" onClick={() => setIsNotificationsOpen((open) => !open)}>
                ○{pendingNotifications.length > 0 && <b>{pendingNotifications.length}</b>}
              </button>
              {isNotificationsOpen && (
                <>
                  <div className="notification-backdrop" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="panel notification-dropdown" role="menu" aria-label="รายการค้างชำระ">
                    <div className="section-title">
                      <h2>รายการค้างชำระ</h2>
                      <span>{pendingNotifications.length} รายการ</span>
                    </div>
                    {pendingNotifications.length ? (
                      <div className="notification-list">
                        {pendingNotifications.slice(0, 6).map((transaction) => (
                          <button
                            type="button"
                            key={transaction.id}
                            className="notification-item"
                            onClick={() => {
                              openEditTransaction(transaction);
                              setIsNotificationsOpen(false);
                            }}
                          >
                            <span>{transaction.title}</span>
                            <b>{currency(transaction.amount)}</b>
                            <small>{statusLabels[transaction.status]}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="muted-note">ไม่มีรายการค้างชำระ</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {pendingError && (
          <div className="error-banner">
            <span>{pendingError}</span>
            <button type="button" onClick={() => setPendingError(null)} aria-label="ปิด">×</button>
          </div>
        )}

        {businesses.length === 0 && activeView !== "businesses" ? (
          <EmptyState title="เริ่มจากเพิ่มธุรกิจแรกของคุณ" action="เพิ่มธุรกิจ" onAction={() => setActiveView("businesses")} />
        ) : (
          <>
            {activeView === "overview" && (
              <section className="dashboard-grid">
                <div className="dashboard-main">
                  <section className="overview-card balance-card">
                    <div className="section-title">
                      <div>
                        <span className="metric-label">Profit overview</span>
                        <h2>ยอดขายและกำไรจริงเดือนนี้</h2>
                      </div>
                      <div className="chart-legend">
                        <span className="legend income-dot">รายได้</span>
                        <span className="legend profit-dot">กำไร</span>
                        <span className="legend expense-dot">เงินออก</span>
                      </div>
                    </div>
                    <div className="balance-row">
                      <div>
                        <strong>{currency(total.income)}</strong>
                        <span>ยอดขายรวม</span>
                      </div>
                      <div>
                        <strong>{currency(total.realProfit)}</strong>
                        <span>กำไรจริง</span>
                      </div>
                    </div>
                    <MiniChart summaries={visibleSummaries} total={total} />
                  </section>

                  <div className="kpi-grid">
                    <Kpi label="รายได้" value={total.income} tone="income" />
                    <Kpi label="ต้นทุน" value={total.cost} tone="cost" />
                    <Kpi label="เงินออก" value={total.expense} tone="expense" />
                    <Kpi label="กำไรขั้นต้น" value={total.grossProfit} tone="profit" />
                    <Kpi label="ค้างรับ" value={total.receivable} tone="pending" />
                    <Kpi label="ค้างจ่าย" value={total.payable} tone="pending" />
                  </div>

                  <div className="dashboard-lower-grid">
                    <section className="overview-card insight-card">
                      <div className="section-title">
                        <h2>Quick insights</h2>
                        <span>{margin.toFixed(1)}% margin</span>
                      </div>
                      <div className="insights">
                        {insights.map((insight) => (
                          <p key={insight}>{insight}</p>
                        ))}
                      </div>
                    </section>

                    <section className="overview-card">
                      <div className="section-title">
                        <h2>ธุรกิจของคุณ</h2>
                        <span>{visibleSummaries.length} ธุรกิจ</span>
                      </div>
                      <div className="business-grid compact-business-grid">
                        {visibleSummaries.map((item) => (
                          <article className="business-card" key={item.business.id} style={{ borderTopColor: item.business.color }}>
                            <div className="business-card-title">
                              <span style={{ backgroundColor: item.business.color }} />
                              <h3>{item.business.name}</h3>
                            </div>
                            <strong>{currency(item.realProfit)}</strong>
                            <div className="business-stats">
                              <span>เงินสด {currency(item.cash)}</span>
                              <span>{item.margin.toFixed(1)}%</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  </div>

                  <TransactionList transactions={filteredTransactions.slice(0, 6)} businesses={businesses} onEdit={openEditTransaction} onDelete={deleteTransactionHandler} compact />
                </div>

                <RightRail
                  total={total}
                  transactions={filteredTransactions.slice(0, 7)}
                  businesses={businesses}
                  onAdd={() => openCreateTransaction()}
                  onQuickAction={openCreateTransaction}
                />
              </section>
            )}

            {activeView === "transactions" && (
              <section className="view-stack">
                <div className="quick-actions">
                  {(["income", "cost", "expense", "owner_contribution", "owner_withdrawal"] as TransactionType[]).map((type) => (
                    <button key={type} onClick={() => openCreateTransaction(type)}>
                      ＋ {typeLabels[type]}
                    </button>
                  ))}
                </div>
                {filteredTransactions.length ? (
                  <TransactionList transactions={filteredTransactions} businesses={businesses} onEdit={openEditTransaction} onDelete={deleteTransactionHandler} />
                ) : (
                  <EmptyState title="ยังไม่มีรายการในเดือนนี้" detail="เพิ่มเงินเข้า ต้นทุน หรือเงินออก เพื่อดูภาพกำไรจริง" action="เพิ่มรายการ" onAction={() => openCreateTransaction()} />
                )}
              </section>
            )}

            {activeView === "reports" && (
              <section className="reports-grid">
                <ReportCard title="กำไรรายเดือน" rows={[["รายได้", total.income], ["ต้นทุน", total.cost], ["เงินออก", total.expense], ["กำไรจริง", total.realProfit]]} />
                <div className="panel">
                  <h2>เปรียบเทียบธุรกิจ</h2>
                  {visibleSummaries.map((item) => (
                    <BarRow key={item.business.id} label={item.business.name} value={item.realProfit} max={Math.max(...visibleSummaries.map((summary) => summary.realProfit), 1)} color={item.business.color} />
                  ))}
                </div>
                <div className="panel">
                  <h2>ค่าใช้จ่ายสูงสุด</h2>
                  {[...new Map(filteredTransactions.filter((item) => item.type === "expense").map((item) => [item.category, 0]))].map(([category]) => {
                    const value = filteredTransactions.filter((item) => item.type === "expense" && item.category === category).reduce((sum, item) => sum + item.amount, 0);
                    return <BarRow key={category} label={category} value={value} max={Math.max(topExpense?.[1] ?? 1, 1)} color="#DC2626" />;
                  })}
                </div>
              </section>
            )}

            {activeView === "accounts" && (
              <FeatureGrid
                title="Accounts"
                intro="รวมสถานะบัญชี เงินสด และแหล่งเงินของแต่ละธุรกิจ"
                cards={[
                  ["บัญชีเงินสด", total.cash, "ยอดเงินสดที่รับจริงหักจ่ายจริง"],
                  ["เงินค้างรับ", total.receivable, "ยอดที่ออกใบแจ้งหนี้แล้วยังไม่รับ"],
                  ["เงินค้างจ่าย", total.payable, "ยอดที่บันทึกแล้วแต่ยังไม่จ่าย"],
                ]}
              />
            )}

            {activeView === "cashflow" && (
              <section className="view-stack">
                <FeatureGrid
                  title="Cash flow"
                  intro="ดูเงินเข้าออกจริงเพื่อแยกกำไรออกจากเงินหมุน"
                  cards={[
                    ["เงินสดคงเหลือ", total.cash, "รับจริง - จ่ายจริง + เงินเจ้าของ"],
                    ["เงินเข้าเดือนนี้", total.income, "รวมรายรับของเดือนที่เลือก"],
                    ["เงินออกเดือนนี้", total.cost + total.expense, "ต้นทุนและค่าใช้จ่ายรวม"],
                  ]}
                />
                <div className="overview-card">
                  <div className="section-title">
                    <h2>Cash movement</h2>
                    <span>{filteredTransactions.length} รายการ</span>
                  </div>
                  <MiniChart summaries={visibleSummaries} total={total} />
                </div>
              </section>
            )}

            {activeView === "budget" && (
              <section className="feature-layout">
                <div className="overview-card">
                  <div className="section-title">
                    <h2>Budget planner</h2>
                    <span>{margin.toFixed(1)}% margin</span>
                  </div>
                  <div className="budget-list">
                    <BarRow label="ต้นทุนไม่เกิน 55% ของรายได้" value={total.cost} max={Math.max(total.income * 0.55, total.cost, 1)} color="#f6b34b" />
                    <BarRow label="ค่าใช้จ่ายไม่เกิน 25% ของรายได้" value={total.expense} max={Math.max(total.income * 0.25, total.expense, 1)} color="#f17a62" />
                    <BarRow label="กันเงินสดขั้นต่ำ 20%" value={total.cash} max={Math.max(total.income * 0.2, total.cash, 1)} color="#9ac83f" />
                  </div>
                </div>
                <div className="overview-card">
                  <h2>คำแนะนำเร็ว</h2>
                  <div className="insights">
                    <p>ถ้าค่าใช้จ่ายเกิน 25% ให้เริ่มจากหมวดที่สูงที่สุดก่อน</p>
                    <p>เงินค้างรับสูงควรติดตามรอบรับเงินให้ชัดเจน</p>
                    <p>แยกเงินเจ้าของออกจากรายได้เสมอเพื่อเห็นกำไรจริง</p>
                  </div>
                </div>
              </section>
            )}

            {activeView === "investments" && (
              <FeatureGrid
                title="Investments"
                intro="พื้นที่ติดตามเงินที่กันไว้สำหรับลงทุนหรือขยายธุรกิจ"
                cards={[
                  ["กำไรที่นำไปต่อยอดได้", Math.max(total.realProfit, 0), "กำไรจริงหลังหักต้นทุนและค่าใช้จ่าย"],
                  ["เงินสดสำรอง", total.cash, "ใช้วางแผนสภาพคล่องก่อนลงทุน"],
                  ["ภาระค้างจ่าย", total.payable, "ควรหักออกก่อนตัดสินใจลงทุน"],
                ]}
              />
            )}

            {activeView === "learning" && (
              <section className="learning-grid">
                {[
                  ["กำไรกับเงินสดต่างกันอย่างไร", "กำไรดีไม่ได้แปลว่ามีเงินสดพอ ถ้ายังมีค้างรับสูง"],
                  ["แยกเงินเจ้าของอย่างไร", "ใช้ประเภทรายการเจ้าของเติมเงินและถอนเงิน ไม่ปนกับรายได้"],
                  ["อ่านค่า margin", "Margin = กำไรจริง / รายได้ ใช้เปรียบเทียบธุรกิจต่างขนาด"],
                  ["ควบคุมค่าใช้จ่าย", "ดูรายงานค่าใช้จ่ายสูงสุด แล้วตั้งงบเป็นรายหมวด"],
                ].map(([title, detail]) => (
                  <article className="overview-card learning-card" key={title}>
                    <span>บทเรียน</span>
                    <h2>{title}</h2>
                    <p>{detail}</p>
                  </article>
                ))}
              </section>
            )}

            {activeView === "support" && (
              <section className="feature-layout">
                <div className="overview-card">
                  <h2>Support</h2>
                  <p className="support-copy">ส่งคำถามหรือรายการที่อยากให้ช่วยตรวจผ่านช่องทางที่คุณใช้ประจำ พร้อมแนบยอดหรือภาพหน้าจอได้</p>
                  <div className="support-actions">
                    <button type="button" onClick={() => setActiveView("learning")}>คู่มือเริ่มต้น</button>
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          `mailto:?subject=${encodeURIComponent("ProfitLens - แจ้งปัญหา")}&body=${encodeURIComponent("อธิบายปัญหาที่พบ:\n")}`,
                        )
                      }
                    >
                      แจ้งปัญหา
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          `mailto:?subject=${encodeURIComponent("ProfitLens - ขอฟีเจอร์ใหม่")}&body=${encodeURIComponent("ฟีเจอร์ที่อยากให้เพิ่ม:\n")}`,
                        )
                      }
                    >
                      ขอฟีเจอร์ใหม่
                    </button>
                  </div>
                </div>
                <div className="overview-card">
                  <h2>Checklist ก่อนขอความช่วยเหลือ</h2>
                  <div className="insights">
                    <p>ระบุเดือนและธุรกิจที่พบปัญหา</p>
                    <p>บอกประเภทรายการและสถานะรับ/จ่าย</p>
                    <p>แนบตัวเลขที่คาดหวังเทียบกับตัวเลขที่แอพแสดง</p>
                  </div>
                </div>
              </section>
            )}

            {activeView === "categories" && (
              <section className="view-stack">
                <form className="category-form" onSubmit={addCategory}>
                  <select value={newCategory.type} onChange={(event) => setNewCategory((current) => ({ ...current, type: event.target.value as TransactionType }))} aria-label="ประเภทหมวดหมู่">
                    {(["income", "cost", "expense", "owner_contribution", "owner_withdrawal", "transfer"] as TransactionType[]).map((type) => (
                      <option key={type} value={type}>{typeLabels[type]}</option>
                    ))}
                  </select>
                  <input value={newCategory.icon} onChange={(event) => setNewCategory((current) => ({ ...current, icon: event.target.value }))} placeholder="ไอคอน" aria-label="ไอคอนหมวดหมู่" maxLength={3} />
                  <input value={newCategory.name} onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))} placeholder="ชื่อหมวดหมู่ใหม่" aria-label="ชื่อหมวดหมู่ใหม่" />
                  <button className="primary-button" type="submit">เพิ่มหมวดหมู่</button>
                </form>

                <div className="category-grid">
                  {(["income", "cost", "expense", "owner_contribution", "owner_withdrawal", "transfer"] as TransactionType[]).map((type) => (
                    <section className="overview-card category-panel" key={type}>
                      <div className="section-title">
                        <h2>{typeLabels[type]}</h2>
                        <span>{categoriesByType[type].length} หมวด</span>
                      </div>
                      <div className="category-list">
                        {categoriesByType[type].map((category) => (
                          <CategoryEditor
                            key={category.id}
                            category={category}
                            isEditing={editingCategoryId === category.id}
                            onEdit={() => setEditingCategoryId(category.id)}
                            onCancel={() => setEditingCategoryId(null)}
                            onSave={updateCategory}
                            onDelete={deleteCategory}
                          />
                        ))}
                        {categoriesByType[type].length === 0 && <p className="muted-note">ยังไม่มีหมวดในประเภทนี้</p>}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            )}

            {activeView === "businesses" && (
              <section className="view-stack">
                {businesses.length === 0 && (
                  <div className="empty-state compact-empty">
                    <h2>เริ่มจากเพิ่มธุรกิจแรกของคุณ</h2>
                    <p>ใส่ชื่อธุรกิจ แล้วค่อยเพิ่มเงินเข้า ต้นทุน หรือเงินออกได้ทันที</p>
                  </div>
                )}
                <form className="business-form" onSubmit={addBusiness}>
                  <input value={newBusinessName} onChange={(event) => setNewBusinessName(event.target.value)} placeholder="ชื่อธุรกิจใหม่" aria-label="ชื่อธุรกิจใหม่" />
                  <button className="primary-button" type="submit">เพิ่มธุรกิจ</button>
                </form>
                <div className="business-manage-list">
                  {businesses.map((business) => (
                    <BusinessEditor
                      key={business.id}
                      business={business}
                      isEditing={editingBusinessId === business.id}
                      onEdit={() => setEditingBusinessId(business.id)}
                      onCancel={() => setEditingBusinessId(null)}
                      onSave={updateBusiness}
                      onDelete={deleteBusiness}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </section>

      <nav className="bottom-nav">
        {navItems.filter((item) => ["overview", "transactions", "cashflow", "categories", "businesses"].includes(item.id)).map((item) => (
          <button
            className={activeView === item.id ? "active" : ""}
            data-nav-id={item.id}
            key={item.id}
            onClick={() => setActiveView(item.id)}
            type="button"
          >
            <span aria-hidden="true" />
            {item.label}
          </button>
        ))}
        <button className="add-tab" onClick={() => openCreateTransaction()} type="button">
          <span aria-hidden="true" />
          เพิ่ม
        </button>
      </nav>

      {isTransactionOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="เพิ่มหรือแก้ไขรายการ">
          <form className="transaction-modal" onSubmit={saveTransaction}>
            <div className="modal-header">
              <h2>{form.id ? "แก้ไขรายการ" : "เพิ่มรายการ"}</h2>
              <button type="button" className="icon-button" onClick={() => setIsTransactionOpen(false)} aria-label="ปิด">×</button>
            </div>

            <div className="type-picker">
              {(["income", "cost", "expense", "owner_contribution", "owner_withdrawal"] as TransactionType[]).map((type) => (
                <button
                  type="button"
                  className={form.type === type ? "active" : ""}
                  key={type}
                  onClick={() => setForm((current) => ({ ...current, type, category: firstCategoryName(categories, type), status: type === "income" || type === "owner_contribution" ? "received" : "paid" }))}
                >
                  {typeLabels[type]}
                </button>
              ))}
            </div>

            <div className="form-grid">
              <label>
                จำนวนเงิน
                <input inputMode="decimal" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0" required />
              </label>
              <label>
                วันที่
                <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required />
              </label>
              <label className="wide">
                ชื่อรายการ
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="เช่น ค่าโฆษณา" required />
              </label>
              <label>
                หมวด
                <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                  {categoriesByType[form.type].map((category) => (
                    <option key={category.id} value={category.name}>{category.icon} {category.name}</option>
                  ))}
                </select>
              </label>
              <label>
                สถานะ
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Status }))}>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="wide checkbox-row">
                <input type="checkbox" checked={form.isShared} onChange={(event) => setForm((current) => ({ ...current, isShared: event.target.checked }))} />
                แบ่งรายการนี้ให้หลายธุรกิจ
              </label>
              {!form.isShared ? (
                <label className="wide">
                  ธุรกิจ
                  <select value={form.businessId} onChange={(event) => setForm((current) => ({ ...current, businessId: event.target.value }))}>
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>{business.name}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="allocation-box wide">
                  {businesses.map((business) => (
                    <label key={business.id}>
                      {business.name}
                      <input
                        inputMode="numeric"
                        value={form.allocations[business.id] ?? "0"}
                        onChange={(event) => setForm((current) => ({ ...current, allocations: { ...current.allocations, [business.id]: event.target.value } }))}
                      />
                      <span>%</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button className="primary-button full" type="submit">บันทึก</button>
          </form>
        </div>
      )}
    </main>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <span>{label}</span>
      <strong>{currency(value)}</strong>
    </article>
  );
}

function MiniChart({ summaries, total }: { summaries: BusinessSummary[]; total: { income: number; cost: number; expense: number; realProfit: number } }) {
  const bars = summaries.length
    ? summaries.map((summary) => ({
        label: summary.business.name.replace("ธุรกิจ ", ""),
        income: summary.income,
        profit: Math.max(summary.realProfit, 0),
        expense: summary.expense + summary.cost,
      }))
    : [
        { label: "รายได้", income: total.income, profit: Math.max(total.realProfit, 0), expense: total.expense + total.cost },
      ];
  const max = Math.max(...bars.flatMap((bar) => [bar.income, bar.profit, bar.expense]), 1);

  return (
    <div className="mini-chart" aria-label="กราฟเปรียบเทียบรายได้ กำไร และเงินออก">
      <div className="chart-grid-lines">
        <span />
        <span />
        <span />
      </div>
      {bars.map((bar) => (
        <div className="chart-group" key={bar.label}>
          <div className="bars">
            <span className="bar income-bar" style={{ height: `${Math.max((bar.income / max) * 100, 8)}%` }} title={`รายได้ ${currency(bar.income)}`} />
            <span className="bar profit-bar" style={{ height: `${Math.max((bar.profit / max) * 100, 8)}%` }} title={`กำไร ${currency(bar.profit)}`} />
            <span className="bar expense-bar" style={{ height: `${Math.max((bar.expense / max) * 100, 8)}%` }} title={`เงินออก ${currency(bar.expense)}`} />
          </div>
          <span>{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

function RightRail({
  total,
  transactions,
  businesses,
  onAdd,
  onQuickAction,
}: {
  total: { income: number; expense: number; realProfit: number; cash: number; receivable: number; payable: number };
  transactions: Transaction[];
  businesses: Business[];
  onAdd: () => void;
  onQuickAction: (type: TransactionType, status: Status) => void;
}) {
  const profitMargin = total.income ? (total.realProfit / total.income) * 100 : 0;
  const cashRatio = total.income ? clamp((total.cash / total.income) * 100, 0, 100) : total.cash > 0 ? 100 : 0;
  const pendingRatio = total.income ? clamp(((total.receivable + total.payable) / total.income) * 100, 0, 100) : total.receivable + total.payable > 0 ? 100 : 0;
  const profitScore = clamp(profitMargin * 1.5 + 45, 0, 100);
  const cashScore = clamp(cashRatio, 0, 100);
  const riskScore = clamp(100 - pendingRatio, 0, 100);
  const healthScore = total.income || total.cash || total.receivable || total.payable
    ? Math.round(profitScore * 0.45 + cashScore * 0.35 + riskScore * 0.2)
    : 0;
  const healthTone = healthScore >= 75 ? "strong" : healthScore >= 45 ? "watch" : "risk";

  return (
    <aside className="right-rail">
      <section className="wallet-card">
        <div className="section-title">
          <div>
            <span className="metric-label">Cash card</span>
            <h2>เงินสดพร้อมใช้</h2>
          </div>
          <button className="small-action" onClick={onAdd} type="button">+ เพิ่ม</button>
        </div>
        <div className="debit-card">
          <span>ProfitLens</span>
          <strong>{currency(total.cash)}</strong>
          <small>Cash balance · {new Date().getFullYear()}</small>
        </div>
        <div className="quick-payment">
          <button type="button" onClick={() => onQuickAction("income", "received")}>รับเงิน</button>
          <button type="button" onClick={() => onQuickAction("expense", "paid")}>จ่ายเงิน</button>
          <button type="button" onClick={() => onQuickAction("income", "pending_receive")}>ค้างรับ</button>
          <button type="button" onClick={() => onQuickAction("expense", "pending_pay")}>ค้างจ่าย</button>
        </div>
      </section>

      <section className="overview-card health-card">
        <div className="section-title">
          <h2>Financial health</h2>
          <span>30d</span>
        </div>
        <div
          aria-label={`Financial health ${healthScore} percent`}
          className={`health-ring ${healthTone}`}
          role="img"
          style={{ "--score": `${healthScore}%` } as CSSProperties}
        >
          <strong>{healthScore}%</strong>
          <span>ความแข็งแรง</span>
        </div>
        <div className="health-breakdown">
          <span><b>{profitMargin.toFixed(0)}%</b> margin</span>
          <span><b>{cashRatio.toFixed(0)}%</b> cash</span>
          <span><b>{pendingRatio.toFixed(0)}%</b> pending</span>
        </div>
        <p>เงินสดเทียบรายได้ {cashRatio.toFixed(0)}% · ค้างรับ {currency(total.receivable)}</p>
      </section>

      <section className="overview-card goal-card">
        <div className="section-title">
          <h2>Goal tracker</h2>
          <span>{businesses.length} ธุรกิจ</span>
        </div>
        <BarRow label="เงินสด" value={total.cash} max={Math.max(total.income, total.cash, 1)} color="#9ac83f" />
        <BarRow label="ค้างรับ" value={total.receivable} max={Math.max(total.income, total.receivable, 1)} color="#ca8a04" />
        <BarRow label="ค้างจ่าย" value={total.payable} max={Math.max(total.income, total.payable, 1)} color="#dc2626" />
      </section>

      <section className="overview-card rail-history">
        <div className="section-title">
          <h2>Transaction history</h2>
          <span>ล่าสุด</span>
        </div>
        <div className="rail-transaction-list">
          {transactions.map((transaction) => (
            <div className="rail-transaction" key={transaction.id}>
              <span className={`rail-icon ${transaction.type}`}>{typeLabels[transaction.type].slice(0, 1)}</span>
              <div>
                <strong>{transaction.title}</strong>
                <small>{statusLabels[transaction.status]}</small>
              </div>
              <b>{currency(transaction.amount)}</b>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function TransactionList({
  transactions,
  businesses,
  onEdit,
  onDelete,
  compact = false,
}: {
  transactions: Transaction[];
  businesses: Business[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <section className="panel">
      <div className="section-title">
        <h2>{compact ? "รายการล่าสุด" : "รายการทั้งหมด"}</h2>
        <span>{transactions.length} รายการ</span>
      </div>
      <div className="transaction-list">
        {transactions.map((transaction) => {
          const business = businesses.find((item) => item.id === transaction.businessId);
          const shared = transaction.allocations?.length;
          return (
            <article className="transaction-row" key={transaction.id}>
              <div className={`type-dot ${transaction.type}`} />
              <div>
                <strong>{transaction.title}</strong>
                <span>{typeLabels[transaction.type]} · {transaction.category} · {business?.name ?? (shared ? "รายการร่วม" : "-")}</span>
              </div>
              <div className="transaction-money">
                <strong>{currency(transaction.amount)}</strong>
                <span>{statusLabels[transaction.status]}</span>
              </div>
              <div className="row-actions">
                <button onClick={() => onEdit(transaction)} aria-label="แก้ไขรายการ">แก้ไข</button>
                <button onClick={() => onDelete(transaction.id)} aria-label="ลบรายการ">ลบ</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReportCard({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <div className="report-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{currency(value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureGrid({ title, intro, cards }: { title: string; intro: string; cards: [string, number, string][] }) {
  return (
    <section className="view-stack">
      <div className="feature-hero">
        <div>
          <span className="metric-label">{title}</span>
          <h2>{intro}</h2>
        </div>
      </div>
      <div className="feature-card-grid">
        {cards.map(([label, value, detail]) => (
          <article className="overview-card feature-card" key={label}>
            <span>{label}</span>
            <strong>{currency(value)}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="bar-row">
      <div>
        <span>{label}</span>
        <strong>{currency(value)}</strong>
      </div>
      <div className="bar-track">
        <span style={{ width: `${Math.max((value / max) * 100, 3)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function BusinessEditor({
  business,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  business: Business;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (id: string, name: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(business.name);
  const [color, setColor] = useState(business.color);

  if (isEditing) {
    return (
      <form className="business-editor" onSubmit={(event) => { event.preventDefault(); onSave(business.id, name, color); }}>
        <input value={name} onChange={(event) => setName(event.target.value)} aria-label="ชื่อธุรกิจ" />
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="สีธุรกิจ" />
        <button type="submit">บันทึก</button>
        <button type="button" onClick={onCancel}>ยกเลิก</button>
      </form>
    );
  }

  return (
    <article className="business-editor">
      <span className="swatch" style={{ backgroundColor: business.color }} />
      <strong>{business.name}</strong>
      <button onClick={onEdit}>แก้ไข</button>
      <button onClick={() => onDelete(business.id)}>ลบ</button>
    </article>
  );
}

function CategoryEditor({
  category,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  category: Category;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (id: string, name: string, icon: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);

  if (isEditing) {
    return (
      <form className="category-editor editing" onSubmit={(event) => { event.preventDefault(); onSave(category.id, name, icon); }}>
        <input value={icon} onChange={(event) => setIcon(event.target.value)} aria-label="ไอคอนหมวดหมู่" maxLength={3} />
        <input value={name} onChange={(event) => setName(event.target.value)} aria-label="ชื่อหมวดหมู่" />
        <button type="submit">บันทึก</button>
        <button type="button" onClick={onCancel}>ยกเลิก</button>
      </form>
    );
  }

  return (
    <article className="category-editor">
      <span>{category.icon}</span>
      <strong>{category.name}</strong>
      <button type="button" onClick={onEdit}>แก้ไข</button>
      <button type="button" onClick={() => onDelete(category.id)}>ลบ</button>
    </article>
  );
}

function EmptyState({ title, detail, action, onAction }: { title: string; detail?: string; action: string; onAction: () => void }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
      <button className="primary-button" onClick={onAction}>＋ {action}</button>
    </div>
  );
}
