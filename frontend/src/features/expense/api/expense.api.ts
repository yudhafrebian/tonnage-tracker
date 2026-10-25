import api from "@/shared/lib/api";
import type {
  CreateExpensePayload,
  Expense,
  ExpenseCategory,
  MonthlyExpense,
  UpdateExpensePayload,
} from "../types/types";

// Selalu ambil satu bulan penuh: filter kategori dilakukan di client,
// supaya total & ringkasan per kategori tetap untuk seluruh bulan.
export const getMonthlyExpenseApi = async (month: string) => {
  const res = await api.get<{ success: true; data: MonthlyExpense }>("/expenses", {
    params: { month },
  });
  return res.data.data;
};

export const getExpenseCategoriesApi = async () => {
  const res = await api.get<{ success: true; data: ExpenseCategory[] }>("/expenses/categories");
  return res.data.data;
};

export const createExpenseApi = async (payload: CreateExpensePayload) => {
  const res = await api.post<{ success: true; data: Expense }>("/expenses", payload);
  return res.data.data;
};

export const updateExpenseApi = async (id: string, payload: UpdateExpensePayload) => {
  const res = await api.patch<{ success: true; data: Expense }>(`/expenses/${id}`, payload);
  return res.data.data;
};

// DELETE /expenses/:id -> 204 tanpa body.
export const deleteExpenseApi = async (id: string) => {
  await api.delete(`/expenses/${id}`);
};
