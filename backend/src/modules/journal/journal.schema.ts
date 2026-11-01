import z from "zod";
import { dateString, kg, monthString } from "../../lib/validators";

export const MARKETS = ["EXPORT", "LOCAL"] as const;
export type MarketValue = (typeof MARKETS)[number];

export const SECTIONS = ["PROCESS", "PACKING", "STOCK", "OUT"] as const;

// Teks bebas apa adanya (hanya spasi di ujung dibuang).
const party = z.string().trim().min(1).max(100);
const item = z.string().trim().min(1).max(100);
// Size boleh kosong ("" -> null). Tidak dikirim (undefined) = tidak diubah saat edit.
const size = z
  .string()
  .trim()
  .max(50)
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

export const idParamSchema = z.object({ id: z.string().min(1).max(64) });

// Satu form = satu pemilik/pelanggan + beberapa baris barang (pola laporan barang keluar staf).
export const createEntriesSchema = z.strictObject({
  date: dateString,
  section: z.enum(SECTIONS),
  party,
  market: z.enum(MARKETS),
  rows: z
    .array(z.strictObject({ item, size, mc: kg.nullable().optional(), kg }))
    .min(1)
    .max(200),
});

export const updateEntrySchema = z
  .strictObject({ party: party.optional(), item: item.optional(), size, mc: kg.nullable().optional(), kg: kg.optional(), market: z.enum(MARKETS).optional() })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "At least one field is required");

export const copyStockSchema = z.strictObject({ date: dateString });

export type CreateEntriesInput = z.infer<typeof createEntriesSchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;

export const dayQuerySchema = z.object({ date: dateString });
export const monthQuerySchema = z.object({ month: monthString });

export const importQuerySchema = z.object({
  // dryRun=true: hanya pratinjau, tidak ada yang disimpan.
  dryRun: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
});

// Field "markets" (JSON) di form import saat menyimpan:
//   suppliers: label per nama supplier (wajib untuk semua supplier di file),
//   rows: label per baris yang berbeda dari label suppliernya (kunci = `key` dari pratinjau).
export const importMarketsSchema = z.object({
  suppliers: z.record(z.string(), z.enum(MARKETS)),
  rows: z.record(z.string(), z.enum(MARKETS)).default({}),
});

export type ImportMarkets = z.infer<typeof importMarketsSchema>;
