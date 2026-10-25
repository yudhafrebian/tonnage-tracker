import z from "zod";
import {
  INPUT_METHODS,
  SECTIONS,
  type CreateRecapPayload,
  type InputMethod,
  type Section,
  type SectionInput,
  type UpdateRecapPayload,
} from "./types/types";
import type { Dictionary } from "@/shared/i18n/types";

// Batas yang sama dengan backend (lib/validators.ts: MAX_KG, kolom Decimal(12, 2)).
const MAX_KG = 9_999_999_999.99;

// Dua kolom yang diketik per method; kolom ketiga dihitung (server juga menghitung ulang).
export const TYPED_PARTS: Record<InputMethod, readonly (keyof Section)[]> = {
  total_export: ["total", "export"],
  total_local: ["total", "local"],
  export_local: ["export", "local"],
};

// Schema dibuat dari kamus supaya pesan validasi ikut bahasa aktif (pola sama dengan makeLoginSchema).
// Di komponen: useMemo(() => makeCreateRecapSchema(dict.recap.validation), [dict]).
export const makeCreateRecapSchema = (m: Dictionary["recap"]["validation"]) => {
  const kg = z
    .number({ error: m.required })
    .min(0, m.negative)
    .max(MAX_KG, m.tooLarge)
    // Cek lewat string, bukan v * 100: 1.1 * 100 = 110.00000000000001 di floating point.
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(String(v)), m.decimals);

  // Form menyimpan ketiga angka supaya tidak hilang saat "cara input" diganti;
  // yang dikirim ke backend hanya dua (lihat toCreateRecapPayload).
  const sectionSchema = z.object({ total: kg, export: kg, local: kg });

  return z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, m.date),
      method: z.enum(INPUT_METHODS),
      process: sectionSchema,
      packing: sectionSchema,
      stock: sectionSchema,
      note: z.string().trim().max(500, m.noteTooLong),
    })
    .superRefine((v, ctx) => {
      for (const s of SECTIONS) {
        const section = v[s];
        // Sama dengan aturan backend (recap.calc.ts resolveSection).
        if (v.method === "total_export" && section.export > section.total) {
          ctx.addIssue({ code: "custom", path: [s, "export"], message: m.exceedsTotal });
        }
        if (v.method === "total_local" && section.local > section.total) {
          ctx.addIssue({ code: "custom", path: [s, "local"], message: m.exceedsTotal });
        }
        if (v.method === "export_local" && section.export + section.local > MAX_KG) {
          ctx.addIssue({ code: "custom", path: [s, "local"], message: m.exceedsMax });
        }
      }
    });
};

export type CreateRecapFormValues = z.infer<ReturnType<typeof makeCreateRecapSchema>>;

// Hanya 2 angka per section sesuai method (backend memakai strictObject, field ketiga ditolak).
const pickTyped = (method: InputMethod, s: Section) =>
  Object.fromEntries(TYPED_PARTS[method].map((p) => [p, s[p]])) as SectionInput;

// Nilai form -> body POST /recaps.
export const toCreateRecapPayload = (v: CreateRecapFormValues): CreateRecapPayload => ({
  date: v.date,
  process: pickTyped(v.method, v.process),
  packing: pickTyped(v.method, v.packing),
  stock: pickTyped(v.method, v.stock),
  ...(v.note ? { note: v.note } : {}),
});

// Nilai form -> body PATCH /recaps/:date. Semua section dikirim (form selalu berisi ketiganya);
// note "" dikirim sebagai null supaya catatan yang dikosongkan benar-benar terhapus.
export const toUpdateRecapPayload = (v: CreateRecapFormValues): UpdateRecapPayload => ({
  process: pickTyped(v.method, v.process),
  packing: pickTyped(v.method, v.packing),
  stock: pickTyped(v.method, v.stock),
  note: v.note || null,
});
