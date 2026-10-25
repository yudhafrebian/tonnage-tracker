// Sesuai respons GET /expenses?month=YYYY-MM (lihat backend expense.service.ts).

export type Expense = {
  id: string;
  date: string; // "2026-10-21"
  category: string;
  amount: number; // rupiah, bilangan bulat
  note: string | null;
  createdBy: { id: string; username: string; name: string };
  createdAt: string;
  updatedAt: string;
};

export type CategoryTotal = { category: string; total: number; count: number };

export type MonthlyExpense = {
  month: string; // "2026-10"
  items: Expense[]; // urut tanggal naik dari backend
  total: number;
  byCategory: CategoryTotal[]; // yang terbesar lebih dulu
};

// GET /expenses/categories: kategori yang pernah dipakai, untuk saran di form.
export type ExpenseCategory = { category: string; count: number; lastUsed: string | null };

export type CreateExpensePayload = {
  date: string;
  category: string;
  amount: number;
  note?: string;
};

// note: null = catatan dihapus.
export type UpdateExpensePayload = {
  date?: string;
  category?: string;
  amount?: number;
  note?: string | null;
};

export type ExpenseDialogState =
  | { type: null }
  | { type: "create" }
  | { type: "edit"; expense: Expense }
  | { type: "delete"; expense: Expense };
