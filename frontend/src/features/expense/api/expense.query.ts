import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/shared/i18n/i18n-provider";
import {
  createExpenseApi,
  deleteExpenseApi,
  getExpenseCategoriesApi,
  getMonthlyExpenseApi,
  updateExpenseApi,
} from "./expense.api";
import type { CreateExpensePayload, UpdateExpensePayload } from "../types/types";

export const expenseKeys = {
  all: ["expenses"] as const,
  monthly: (month: string) => ["expenses", "monthly", month] as const,
  categories: ["expenses", "categories"] as const,
};

// Pengeluaran ikut dihitung di rekap (kolom & kartu keuangan) dan dashboard,
// jadi keduanya disegarkan setiap kali pengeluaran berubah.
const invalidateAfterChange = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["recaps"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  ]);

export const useMonthlyExpenseQuery = (month: string) => {
  return useQuery({
    queryKey: expenseKeys.monthly(month),
    queryFn: () => getMonthlyExpenseApi(month),
  });
};

export const useExpenseCategoriesQuery = () => {
  return useQuery({
    queryKey: expenseKeys.categories,
    queryFn: getExpenseCategoriesApi,
  });
};

export const useCreateExpenseMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => createExpenseApi(payload),
    onSuccess: () => {
      toast.add({ description: dict.expense.created, type: "success" });
      return invalidateAfterChange(queryClient);
    },
  });
};

export const useUpdateExpenseMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExpensePayload }) =>
      updateExpenseApi(id, payload),
    onSuccess: () => {
      toast.add({ description: dict.expense.updated, type: "success" });
      return invalidateAfterChange(queryClient);
    },
  });
};

export const useDeleteExpenseMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: (id: string) => deleteExpenseApi(id),
    onSuccess: () => {
      toast.add({ description: dict.expense.deleted, type: "success" });
      return invalidateAfterChange(queryClient);
    },
  });
};
