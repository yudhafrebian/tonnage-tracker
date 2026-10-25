import z from "zod";
import { monthString } from "../../lib/validators";

// Bulan default: bulan berjalan (WIB), diisi di controller.
export const monthQuerySchema = z.object({ month: monthString.optional() });

export const monthlyTrendQuerySchema = z.object({
  to: monthString.optional(),
  months: z.coerce.number().int().min(1).max(36).default(12),
});
