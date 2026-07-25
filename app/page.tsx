"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Business = {
  id: string;
  name: string;
  color: string;
};

type TransactionType =
  | "income"
  | "cost"
  | "expense"
  | "owner_contribution"
  | "owner_withdrawal"
  | "transfer";

type Status = "received" | "pending_receive" | "paid" | "pending_pay";

type Allocation = {
  businessId: string;
  percent: number;
};

type Transaction = {
  id: string;
  date: string;
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  status: Status;
  businessId?: string;
  allocations?: Allocation[];
};

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

const businessColors = ["#2563EB", "#16A34A", "#F97316", "#9333EA", "#0891B2"];

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

const categoryOptions: Record<TransactionType, string[]> = {
  income: ["ขายสินค้า", "ค่าบริการ", "รายได้อื่น"],
  cost: ["ต้นทุนสินค้า", "ค่าจ้างผลิต", "วัตถุดิบ"],
  expense: ["ค่าโฆษณา", "ค่าขนส่ง", "ค่าเช่า", "ค่าเดินทาง", "ซอฟต์แวร์"],
  owner_contribution: ["เงินเจ้าของ", "เพิ่มทุน"],
  owner_withdrawal: ["ถอนใช้ส่วนตัว", "คืนทุน"],
  transfer: ["โอนระหว่างบัญชี", "ปรับยอดเงินสด"],
};

const initialBusinesses: Business[] = [
  { id: "biz-a", name: "ธุรกิจ A", color: "#2563EB" },
  { id: "biz-b", name: "ธุรกิจ B", color: "#16A34A" },
];

const initialTransactions: Transaction[] = [
  {
    id: "t1",
    date: "2026-07-03",
    type: "income",
    title: "ขายสินค้า",
    category: "ขายสินค้า",
    amount: 200000,
    status: "received",
    businessId: "biz-a",
  },
  {
    id: "t2",
    date: "2026-07-05",
    type: "cost",
    title: "ต้นทุนสินค้า",
    category: "ต้นทุนสินค้า",
    amount: 100000,
    status: "paid",
    businessId: "biz-a",
  },
  {
    id: "t3",
    date: "2026-07-08",
    type: "expense",
    title: "ค่าโฆษณา",
    category: "ค่าโฆษณา",
    amount: 25000,
    status: "paid",
    businessId: "biz-a",
  },
  {
    id: "t4",
    date: "2026-07-10",
    type: "expense",
    title: "ค่าขนส่ง",
    category: "ค่าขนส่ง",
    amount: 10000,
    status: "paid",
    businessId: "biz-a",
  },
  {
    id: "t5",
    date: "2026-07-15",
    type: "expense",
    title: "ค่าซอฟต์แวร์",
    category: "ซอฟต์แวร์",
    amount: 10000,
    status: "pending_pay",
    businessId: "biz-a",
  },
  {
    id: "t6",
    date: "2026-07-04",
    type: "income",
    title: "ค่าบริการ",
    category: "ค่าบริการ",
    amount: 120000,
    status: "received",
    businessId: "biz-b",
  },
  {
    id: "t7",
    date: "2026-07-06",
    type: "cost",
    title: "ค่าจ้างผลิต",
    category: "ค่าจ้างผลิต",
    amount: 80000,
    status: "paid",
    businessId: "biz-b",
  },
  {
    id: "t8",
    date: "2026-07-11",
    type: "expense",
    title: "ค่าโฆษณา",
    category: "ค่าโฆษณา",
    amount: 12000,
    status: "paid",
    businessId: "biz-b",
  },
  {
    id: "t9",
    date: "2026-07-13",
    type: "expense",
    title: "ค่าเดินทาง",
    category: "ค่าเดินทาง",
    amount: 8000,
    status: "paid",
    businessId: "biz-b",
  },
  {
    id: "t10",
    date: "2026-07-18",
    type: "expense",
    title: "ค่าเช่าออฟฟิศ",
    category: "ค่าเช่า",
    amount: 20000,
    status: "paid",
    allocations: [
      { businessId: "biz-a", percent: 70 },
      { businessId: "biz-b", percent: 30 },
    ],
  },
  {
    id: "t11",
    date: "2026-07-20",
    type: "income",
    title: "ใบแจ้งหนี้รอรับ",
    category: "ค่าบริการ",
    amount: 42000,
    status: "pending_receive",
    businessId: "biz-b",
  },
  {
    id: "t12",
    date: "2026-07-21",
    type: "owner_contribution",
    title: "เจ้าของเติมเงินสด",
    category: "เงินเจ้าของ",
    amount: 15000,
    status: "received",
    businessId: "biz-a",
  },
];

const emptyForm = (businesses: Business[]): FormState => ({
  date: "2026-07-24",
  type: "income",
  title: "",
  category: "ขายสินค้า",
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

export default function Home() {
  const [activeView, setActiveView] = useState("overview");
  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [selectedMonth, setSelectedMonth] = useState("2026-07");
  const [selectedBusiness, setSelectedBusiness] = useState("all");
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(initialBusinesses));
  const [newBusinessName, setNewBusinessName] = useState("");
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("profitlens-data");
    if (!saved) return;
    const parsed = JSON.parse(saved) as { businesses: Business[]; transactions: Transaction[] };
    setBusinesses(parsed.businesses);
    setTransactions(parsed.transactions);
    setForm(emptyForm(parsed.businesses));
  }, []);

  useEffect(() => {
    window.localStorage.setItem("profitlens-data", JSON.stringify({ businesses, transactions }));
  }, [businesses, transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const monthMatch = monthKey(transaction.date) === selectedMonth;
      const businessMatch =
        selectedBusiness === "all" ||
        transaction.businessId === selectedBusiness ||
        transaction.allocations?.some((allocation) => allocation.businessId === selectedBusiness);
      return monthMatch && businessMatch;
    });
  }, [transactions, selectedMonth, selectedBusiness]);

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

  function openCreateTransaction(type: TransactionType = "income") {
    const next = emptyForm(businesses);
    next.type = type;
    next.category = categoryOptions[type][0];
    next.status = type === "income" || type === "owner_contribution" ? "received" : "paid";
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

    const transaction: Transaction = {
      id: form.id ?? crypto.randomUUID(),
      date: form.date,
      type: form.type,
      title: form.title.trim(),
      category: form.category,
      amount,
      status: form.status,
      businessId: form.isShared ? undefined : form.businessId,
      allocations: form.isShared ? allocationEntries.map((item) => ({ ...item, percent: (item.percent / percentTotal) * 100 })) : undefined,
    };

    setTransactions((items) => (form.id ? items.map((item) => (item.id === form.id ? transaction : item)) : [transaction, ...items]));
    setIsTransactionOpen(false);
  }

  function addBusiness(event: FormEvent) {
    event.preventDefault();
    const name = newBusinessName.trim();
    if (!name) return;
    const business: Business = {
      id: crypto.randomUUID(),
      name,
      color: businessColors[businesses.length % businessColors.length],
    };
    setBusinesses((items) => [...items, business]);
    setForm((current) => ({ ...current, allocations: { ...current.allocations, [business.id]: "0" } }));
    setNewBusinessName("");
  }

  function updateBusiness(id: string, name: string, color: string) {
    setBusinesses((items) => items.map((item) => (item.id === id ? { ...item, name, color } : item)));
    setEditingBusinessId(null);
  }

  function deleteBusiness(id: string) {
    setBusinesses((items) => items.filter((item) => item.id !== id));
    setTransactions((items) => items.filter((item) => item.businessId !== id && !item.allocations?.some((allocation) => allocation.businessId === id)));
  }

  const navItems = [
    { id: "overview", label: "ภาพรวม", icon: "⌂" },
    { id: "transactions", label: "รายการ", icon: "≡" },
    { id: "reports", label: "รายงาน", icon: "▥" },
    { id: "businesses", label: "ธุรกิจ", icon: "●" },
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
            <button className={activeView === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => setActiveView(item.id)}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">กรกฎาคม 2026</p>
            <h1>{activeView === "overview" ? "เดือนนี้ธุรกิจเป็นอย่างไร" : navItems.find((item) => item.id === activeView)?.label}</h1>
          </div>
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
          </div>
        </header>

        {businesses.length === 0 ? (
          <EmptyState title="เริ่มจากเพิ่มธุรกิจแรกของคุณ" action="เพิ่มธุรกิจ" onAction={() => setActiveView("businesses")} />
        ) : (
          <>
            {activeView === "overview" && (
              <section className="view-stack">
                <div className="hero-metrics">
                  <div>
                    <span className="metric-label">กำไรจริงรวม</span>
                    <strong>{currency(total.realProfit)}</strong>
                    <span className="submetric">เงินสดคงเหลือ {currency(total.cash)} · Margin {margin.toFixed(1)}%</span>
                  </div>
                  <div className="insights">
                    {insights.map((insight) => (
                      <p key={insight}>{insight}</p>
                    ))}
                  </div>
                </div>

                <div className="kpi-grid">
                  <Kpi label="รายได้" value={total.income} tone="income" />
                  <Kpi label="ต้นทุน" value={total.cost} tone="cost" />
                  <Kpi label="เงินออก" value={total.expense} tone="expense" />
                  <Kpi label="กำไรขั้นต้น" value={total.grossProfit} tone="profit" />
                  <Kpi label="ค้างรับ" value={total.receivable} tone="pending" />
                  <Kpi label="ค้างจ่าย" value={total.payable} tone="pending" />
                </div>

                <section className="section-block">
                  <div className="section-title">
                    <h2>ธุรกิจของคุณ</h2>
                    <span>{visibleSummaries.length} ธุรกิจ</span>
                  </div>
                  <div className="business-grid">
                    {visibleSummaries.map((item) => (
                      <article className="business-card" key={item.business.id} style={{ borderTopColor: item.business.color }}>
                        <div className="business-card-title">
                          <span style={{ backgroundColor: item.business.color }} />
                          <h3>{item.business.name}</h3>
                        </div>
                        <strong>{currency(item.realProfit)}</strong>
                        <div className="business-stats">
                          <span>เงินสด {currency(item.cash)}</span>
                          <span>Margin {item.margin.toFixed(1)}%</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <TransactionList transactions={filteredTransactions.slice(0, 6)} businesses={businesses} onEdit={openEditTransaction} onDelete={(id) => setTransactions((items) => items.filter((item) => item.id !== id))} compact />
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
                  <TransactionList transactions={filteredTransactions} businesses={businesses} onEdit={openEditTransaction} onDelete={(id) => setTransactions((items) => items.filter((item) => item.id !== id))} />
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

            {activeView === "businesses" && (
              <section className="view-stack">
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
        {navItems.map((item) => (
          <button className={activeView === item.id ? "active" : ""} key={item.id} onClick={() => setActiveView(item.id)}>
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button className="add-tab" onClick={() => openCreateTransaction()}>
          ＋<span>เพิ่ม</span>
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
                  onClick={() => setForm((current) => ({ ...current, type, category: categoryOptions[type][0], status: type === "income" || type === "owner_contribution" ? "received" : "paid" }))}
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
                  {categoryOptions[form.type].map((category) => (
                    <option key={category}>{category}</option>
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

function EmptyState({ title, detail, action, onAction }: { title: string; detail?: string; action: string; onAction: () => void }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
      <button className="primary-button" onClick={onAction}>＋ {action}</button>
    </div>
  );
}
