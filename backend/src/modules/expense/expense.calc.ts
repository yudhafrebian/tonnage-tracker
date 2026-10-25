import type { Expense } from "../../generated/prisma/client";

export type CategoryTotal = { category: string; total: number; count: number };

export const sumExpenses = (expenses: Pick<Expense, "amount">[]) =>
  expenses.reduce((acc, e) => acc + e.amount, 0);

// Total per kategori, yang terbesar lebih dulu.
export function totalsByCategory(expenses: Pick<Expense, "category" | "amount">[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const e of expenses) {
    const row = map.get(e.category) ?? { category: e.category, total: 0, count: 0 };
    row.total += e.amount;
    row.count += 1;
    map.set(e.category, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}
