import z from "zod";
import type { Dictionary } from "@/shared/i18n/types";
import { MARKETS } from "./types/types";

// Batas yang sama dengan backend (lib/validators.ts: MAX_KG, kolom Decimal(12, 2)).
const MAX_KG = 9_999_999_999.99;
const twoDecimals = (v: number) => /^\d+(\.\d{1,2})?$/.test(String(v));

// Input angka kosong menghasilkan NaN (valueAsNumber): MC boleh kosong, Kg wajib.
export const makeEntrySchemas = (m: Dictionary["journalManual"]["form"]) => {
  const kg = z
    .number({ error: m.required })
    .min(0, m.invalidNumber)
    .max(MAX_KG, m.invalidNumber)
    .refine(twoDecimals, m.invalidNumber);
  const mc = z.preprocess(
    (v) => (typeof v === "number" && Number.isNaN(v) ? null : v),
    z.number().min(0, m.invalidNumber).max(MAX_KG, m.invalidNumber).refine(twoDecimals, m.invalidNumber).nullable(),
  );
  const row = z.object({
    item: z.string().trim().min(1, m.required).max(100),
    size: z.string().trim().max(50),
    mc,
    kg,
  });
  const header = {
    party: z.string().trim().min(1, m.required).max(100),
    market: z.enum(MARKETS),
  };
  return {
    create: z.object({ ...header, rows: z.array(row).min(1) }),
    edit: z.object({ ...header, ...row.shape }),
  };
};

type Schemas = ReturnType<typeof makeEntrySchemas>;
export type CreateEntriesFormValues = z.input<Schemas["create"]>;
export type CreateEntriesFormOutput = z.output<Schemas["create"]>;
export type EditEntryFormValues = z.input<Schemas["edit"]>;
export type EditEntryFormOutput = z.output<Schemas["edit"]>;
