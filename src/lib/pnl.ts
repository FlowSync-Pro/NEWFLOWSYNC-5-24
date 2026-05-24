export type TxType = "income" | "expense";

export interface Tx {
  id: string;
  type: TxType;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

export const INCOME_CATEGORIES = [
  "Grocery",
  "Food",
  "Furniture",
  "Courier",
  "Pharmacy",
  "Senior errands",
  "Moving",
  "Auto parts",
  "Tips",
  "Other",
];

export const EXPENSE_CATEGORIES = [
  "Fuel",
  "Maintenance",
  "Insurance",
  "Supplies",
  "Phone",
  "Tolls & parking",
  "Other",
];

const KEY = "flowsync.pnl";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function seedTransactions(): Tx[] {
  return [
    { id: "s1", type: "income", category: "Grocery", amount: 92, date: daysAgo(1), note: "2 shops, Whole Foods" },
    { id: "s2", type: "income", category: "Moving", amount: 340, date: daysAgo(2), note: "1-bed apartment" },
    { id: "s3", type: "expense", category: "Fuel", amount: 48, date: daysAgo(2) },
    { id: "s4", type: "income", category: "Courier", amount: 76, date: daysAgo(3), note: "Legal docs" },
    { id: "s5", type: "income", category: "Tips", amount: 35, date: daysAgo(3) },
    { id: "s6", type: "expense", category: "Supplies", amount: 22, date: daysAgo(4), note: "Moving blankets" },
    { id: "s7", type: "income", category: "Pharmacy", amount: 64, date: daysAgo(6) },
    { id: "s8", type: "expense", category: "Fuel", amount: 51, date: daysAgo(9) },
    { id: "s9", type: "income", category: "Furniture", amount: 145, date: daysAgo(12) },
    { id: "s10", type: "expense", category: "Maintenance", amount: 89, date: daysAgo(15), note: "Oil change" },
    { id: "s11", type: "income", category: "Grocery", amount: 88, date: daysAgo(18) },
    { id: "s12", type: "expense", category: "Insurance", amount: 130, date: daysAgo(20), note: "Monthly premium" },
  ];
}

export function loadTransactions(): Tx[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return seedTransactions();
  try {
    return JSON.parse(raw) as Tx[];
  } catch {
    return seedTransactions();
  }
}

export function saveTransactions(txs: Tx[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(txs));
}

export function resetTransactions() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export type Period = "week" | "month" | "all";

export function inPeriod(dateStr: string, period: Period): boolean {
  if (period === "all") return true;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  if (period === "week") {
    const sevenAgo = new Date();
    sevenAgo.setDate(now.getDate() - 6);
    sevenAgo.setHours(0, 0, 0, 0);
    return d >= sevenAgo;
  }
  // month
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export interface Totals {
  income: number;
  expenses: number;
  net: number;
  margin: number;
}

export function totals(txs: Tx[]): Totals {
  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;
  const margin = income > 0 ? (net / income) * 100 : 0;
  return { income, expenses, net, margin };
}

export function byCategory(txs: Tx[], type: TxType): { category: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== type) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function toCSV(txs: Tx[]): string {
  const header = "Date,Type,Category,Amount,Note";
  const rows = [...txs]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((t) => `${t.date},${t.type},${t.category},${t.amount},"${(t.note ?? "").replace(/"/g, '""')}"`);
  return [header, ...rows].join("\n");
}
