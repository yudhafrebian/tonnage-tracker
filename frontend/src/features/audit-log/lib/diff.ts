import type { AuditSnapshot } from "../types/types";

export type FieldChange = { path: string; before: unknown; after: unknown };

// { process: { total: 1 }, note: null } -> { "process.total": 1, note: null }
const flatten = (obj: AuditSnapshot | null, prefix = ""): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value as AuditSnapshot, path));
    } else {
      out[path] = value;
    }
  }
  return out;
};

// Urutan tampil mengikuti urutan form; kolom lain (tidak dikenal) di belakang.
const ORDER = [
  "date", "effectiveFrom", "category", "amount", "pricePerKg",
  "process.export", "process.local", "process.total",
  "packing.export", "packing.local", "packing.total",
  "stock.export", "stock.local", "stock.total",
  "note", "method", "sheet",
];
const rank = (path: string) => {
  const i = ORDER.indexOf(path);
  return i === -1 ? ORDER.length : i;
};

// Tambah/import: semua nilai "sesudah". Hapus: semua nilai "sebelum".
// Ubah: hanya kolom yang nilainya berbeda.
export function diffSnapshots(before: AuditSnapshot | null, after: AuditSnapshot | null): FieldChange[] {
  const b = flatten(before);
  const a = flatten(after);
  const paths = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  const bothSides = before !== null && after !== null;

  return paths
    // "method" hanya ada di snapshot sesudah (cara input), bukan perubahan nilai.
    .filter((p) => !bothSides || (p !== "method" && b[p] !== a[p]))
    .sort((x, y) => rank(x) - rank(y))
    .map((path) => ({ path, before: b[path], after: a[path] }));
}

// Label singkat baris log, mis. tanggal rekap atau "Solar · 21 Okt".
export const snapshotSubject = (s: AuditSnapshot | null) => ({
  date: (s?.date ?? s?.effectiveFrom) as string | undefined,
  category: s?.category as string | undefined,
});
