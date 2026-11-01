import z from "zod";
import { dateString, MAX_KG, monthString } from "../../lib/validators";
import { Prisma } from "../../generated/prisma/client";

export const CAUSES = ["MISCOUNT", "DAMAGE", "OUT_UNRECORDED", "OTHER"] as const;
export const STATUSES = ["OPEN", "RESOLVED"] as const;

// Selisih boleh negatif (barang kurang dari catatan), maksimal 2 desimal.
const diff = z
  .number()
  .min(-MAX_KG)
  .max(MAX_KG)
  .refine((v) => new Prisma.Decimal(v).decimalPlaces() <= 2, "Maximum 2 decimal places")
  .nullable()
  .optional();

const text = (max: number) => z.string().trim().min(1).max(max);
// Kosong ("") -> null; tidak dikirim (undefined) = tidak diubah saat edit.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));

export const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  month: monthString.optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1).max(64) });

export const createDiscrepancySchema = z
  .strictObject({
    date: dateString,
    party: text(100),
    item: text(100),
    size: optionalText(50),
    mcDiff: diff,
    kgDiff: diff,
    cause: z.enum(CAUSES),
    note: optionalText(500),
  })
  .refine((v) => v.mcDiff != null || v.kgDiff != null, { message: "mc_or_kg_required", path: ["kgDiff"] });

export const updateDiscrepancySchema = z
  .strictObject({
    date: dateString.optional(),
    party: text(100).optional(),
    item: text(100).optional(),
    size: optionalText(50),
    mcDiff: diff,
    kgDiff: diff,
    cause: z.enum(CAUSES).optional(),
    note: optionalText(500),
    status: z.enum(STATUSES).optional(),
    resolution: optionalText(500),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "At least one field is required");

export type CreateDiscrepancyInput = z.infer<typeof createDiscrepancySchema>;
export type UpdateDiscrepancyInput = z.infer<typeof updateDiscrepancySchema>;
