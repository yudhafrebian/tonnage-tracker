import z from "zod";
import type { Dictionary } from "@/shared/i18n/types";
import { CAUSES } from "./types/types";

const MAX = 9_999_999_999.99;
// Boleh negatif (barang kurang dari catatan); maksimal 2 desimal.
const twoDecimals = (v: number) => /^-?\d+(\.\d{1,2})?$/.test(String(v));

export const makeDiscrepancySchema = (m: Dictionary["discrepancy"]["form"]) => {
  // Input angka kosong = NaN (valueAsNumber) -> null.
  const diff = z.preprocess(
    (v) => (typeof v === "number" && Number.isNaN(v) ? null : v),
    z.number().min(-MAX, m.invalidNumber).max(MAX, m.invalidNumber).refine(twoDecimals, m.invalidNumber).nullable(),
  );
  return z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, m.required),
      party: z.string().trim().min(1, m.required).max(100),
      item: z.string().trim().min(1, m.required).max(100),
      size: z.string().trim().max(50),
      mcDiff: diff,
      kgDiff: diff,
      cause: z.enum(CAUSES),
      note: z.string().trim().max(500),
    })
    .refine((v) => v.mcDiff !== null || v.kgDiff !== null, { message: m.diffRequired, path: ["kgDiff"] });
};

export type DiscrepancyFormValues = z.input<ReturnType<typeof makeDiscrepancySchema>>;
export type DiscrepancyFormOutput = z.output<ReturnType<typeof makeDiscrepancySchema>>;
