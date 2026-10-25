import z from "zod";
import type { Dictionary } from "@/shared/i18n/types";
import type { CreateExpensePayload, UpdateExpensePayload } from "./types/types";

// Batas yang sama dengan backend (expense.schema.ts: kolom Int PostgreSQL).
const MAX_AMOUNT = 2_000_000_000;

// Schema dibuat dari kamus supaya pesan validasi ikut bahasa aktif (pola sama dengan makeCreateRecapSchema).
export const makeExpenseSchema = (m: Dictionary["expense"]["validation"]) =>
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, m.date),
    category: z.string().trim().min(1, m.categoryRequired).max(100, m.categoryTooLong),
    amount: z
      .number({ error: m.amountRequired })
      .int(m.amountRequired)
      .positive(m.amountPositive)
      .max(MAX_AMOUNT, m.amountTooLarge),
    note: z.string().trim().max(500, m.noteTooLong),
  });

export type ExpenseFormValues = z.infer<ReturnType<typeof makeExpenseSchema>>;

export const toCreateExpensePayload = (v: ExpenseFormValues): CreateExpensePayload => ({
  date: v.date,
  category: v.category,
  amount: v.amount,
  ...(v.note ? { note: v.note } : {}),
});

// note "" dikirim sebagai null supaya catatan yang dikosongkan benar-benar terhapus.
export const toUpdateExpensePayload = (v: ExpenseFormValues): UpdateExpensePayload => ({
  date: v.date,
  category: v.category,
  amount: v.amount,
  note: v.note || null,
});
