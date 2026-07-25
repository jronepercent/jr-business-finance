export type TransactionType =
  | "income"
  | "cost"
  | "expense"
  | "owner_contribution"
  | "owner_withdrawal"
  | "transfer";

export type Status = "received" | "pending_receive" | "paid" | "pending_pay";

export type Business = {
  id: string;
  name: string;
  color: string;
};

export type Category = {
  id: string;
  type: TransactionType;
  name: string;
  icon: string;
};

export type Allocation = {
  businessId: string;
  percent: number;
};

export type Transaction = {
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
