import type { TransactionType } from "./types";

export const categoryOptions: Record<TransactionType, string[]> = {
  income: ["ขายสินค้า", "ค่าบริการ", "รายได้อื่น"],
  cost: ["ต้นทุนสินค้า", "ค่าจ้างผลิต", "วัตถุดิบ"],
  expense: ["ค่าโฆษณา", "ค่าขนส่ง", "ค่าเช่า", "ค่าเดินทาง", "ซอฟต์แวร์"],
  owner_contribution: ["เงินเจ้าของ", "เพิ่มทุน"],
  owner_withdrawal: ["ถอนใช้ส่วนตัว", "คืนทุน"],
  transfer: ["โอนระหว่างบัญชี", "ปรับยอดเงินสด"],
};

function iconForType(type: TransactionType) {
  switch (type) {
    case "income":
      return "↗";
    case "cost":
      return "◧";
    case "expense":
      return "↘";
    case "owner_contribution":
      return "+";
    case "owner_withdrawal":
      return "-";
    case "transfer":
      return "⇄";
  }
}

export type DefaultCategory = { type: TransactionType; name: string; icon: string };

export const defaultCategories: DefaultCategory[] = Object.entries(categoryOptions).flatMap(([type, names]) =>
  names.map((name) => ({ type: type as TransactionType, name, icon: iconForType(type as TransactionType) })),
);
