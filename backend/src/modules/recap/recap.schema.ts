import z from "zod";
import { dateString, kg, monthString } from "../../lib/validators";

export const INPUT_METHODS = ["total_export", "total_local", "export_local"] as const;
export type InputMethod = (typeof INPUT_METHODS)[number];

export const SECTIONS = ["process", "packing", "stock"] as const;
export type SectionName = (typeof SECTIONS)[number];

// Dua angka yang diketik admin per section; angka ketiga dihitung server.
// strictObject: field yang tidak sesuai method (misalnya `local` pada total_export) ditolak.
const SECTION_SCHEMAS = {
  total_export: z.strictObject({ total: kg, export: kg }),
  total_local: z.strictObject({ total: kg, local: kg }),
  export_local: z.strictObject({ export: kg, local: kg }),
} satisfies Record<InputMethod, z.ZodType>;

export type SectionInput = Partial<Record<"total" | "export" | "local", number>>;

const note = z.string().trim().max(500);

export const methodQuerySchema = z.object({
  method: z.enum(INPUT_METHODS).default("total_export"),
});

export const monthQuerySchema = z.object({ month: monthString });

export const dateParamSchema = z.object({ date: dateString });

export const createRecapSchema = (method: InputMethod) => {
  const section = SECTION_SCHEMAS[method];
  return z.strictObject({
    date: dateString,
    process: section,
    packing: section,
    stock: section,
    note: note.optional(),
  });
};

export const updateRecapSchema = (method: InputMethod) => {
  const section = SECTION_SCHEMAS[method];
  return z
    .strictObject({
      process: section.optional(),
      packing: section.optional(),
      stock: section.optional(),
      note: note.nullable().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, "At least one field is required");
};

export type CreateRecapInput = z.infer<ReturnType<typeof createRecapSchema>>;
export type UpdateRecapInput = z.infer<ReturnType<typeof updateRecapSchema>>;

export const yearQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export const exportQuerySchema = z.object({ month: monthString });

export const importQuerySchema = z.object({
  month: monthString,
  // dryRun=true: hanya pratinjau, tidak ada yang disimpan.
  dryRun: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  // Kalau tanggal sudah punya rekap dengan angka berbeda: dilewati (skip) atau ditimpa (overwrite).
  onConflict: z.enum(["skip", "overwrite"]).default("skip"),
});

export type ImportOptions = Omit<z.infer<typeof importQuerySchema>, "month">;
