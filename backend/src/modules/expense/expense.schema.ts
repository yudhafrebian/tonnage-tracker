import z from "zod";
import { dateString, monthString } from "../../lib/validators";

// "  Solar   kapal " -> "Solar kapal"
const category = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(1, "Category is required").max(100));

// Batas kolom Int di PostgreSQL (sekitar 2,1 miliar) per satu catatan pengeluaran.
const amount = z.number().int().positive().max(2_000_000_000);

const note = z.string().trim().max(500);

export const listExpenseQuerySchema = z.object({
  month: monthString,
  category: z.string().trim().min(1).max(100).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1).max(64) });

export const createExpenseSchema = z.strictObject({
  date: dateString,
  category,
  amount,
  note: note.optional(),
});

export const updateExpenseSchema = z
  .strictObject({
    date: dateString.optional(),
    category: category.optional(),
    amount: amount.optional(),
    note: note.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
