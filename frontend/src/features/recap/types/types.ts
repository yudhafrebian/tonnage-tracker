// Sesuai respons GET /recaps?month=YYYY-MM (lihat backend recap.calc.ts).

export const SECTIONS = ["process", "packing", "stock"] as const;
export type SectionName = (typeof SECTIONS)[number];

export type Section = {
  total: number;
  export: number;
  local: number;
};

export type Recap = {
  id: string;
  date: string; // "2026-10-01"
  process: Section;
  packing: Section;
  stock: Section;
  note: string | null;
  // Hanya dikirim untuk role dengan finance:read (OWNER/ADMIN).
  pricePerKg?: number | null;
  income?: number | null;
  createdAt: string;
  updatedAt: string;
};

// Satu baris tabel = satu tanggal. recap null = tanggal belum diisi.
export type RecapDay = {
  date: string;
  recap: Recap | null;
  expense?: number;
};

export type MonthlyRecap = {
  month: string; // "2026-10"
  days: RecapDay[];
  total: {
    process: Section;
    packing: Section;
    // Sisa tidak dijumlah: ini sisa di tanggal terakhir yang sudah diisi (stockDate).
    stock: Section | null;
    stockDate: string | null;
    income?: number;
    expense?: number;
    profit?: number;
  };
  missingDates: string[];
  unpricedDates?: string[];
  expenseByCategory?: { category: string; total: number; count: number }[];
};

export const INPUT_METHODS = ["total_export", "total_local", "export_local"] as const;
export type InputMethod = (typeof INPUT_METHODS)[number];

// Dua angka per section sesuai method; angka ketiga dihitung server.
export type SectionInput =
  | { total: number; export: number }   // total_export
  | { total: number; local: number }    // total_local
  | { export: number; local: number };  // export_local

export type CreateRecapPayload = {
  date: string; // "2026-10-21"
  process: SectionInput;
  packing: SectionInput;
  stock: SectionInput;
  note?: string;
};

// PATCH /recaps/:date?method=... — tanggal di URL, bukan di body.
// note: null / "" = catatan dihapus.
export type UpdateRecapPayload = {
  process?: SectionInput;
  packing?: SectionInput;
  stock?: SectionInput;
  note?: string | null;
};

// Import Excel (POST /recaps/import). Backend selalu memakai cara input Ekspor + Lokal.
export type ImportConflict = "skip" | "overwrite";
export type ImportAction = "create" | "update" | "skip" | "unchanged";

export type ImportResult = {
  month: string;
  sheet: string; // nama sheet yang dibaca, mis. "REKAP OKT"
  dryRun: boolean;
  onConflict: ImportConflict;
  summary: Record<ImportAction, number>;
  rows: { date: string; action: ImportAction; process: Section; packing: Section; stock: Section }[];
};

export type DialogType = 'create' | 'edit' | 'delete' | 'import' | null

export type RecapView = "monthly" | "yearly";

// Dialog yang sedang terbuka + tanggal terkait (dari kolom Aksi di tabel).
export type DialogState = { type: DialogType; date?: string };

// Satu baris per bulan di tab Tahunan (backend: MonthSummary di recap.calc.ts).
export type MonthSummary = MonthlyRecap["total"] & {
  month: string; // "2026-10"
  recordedDays: number; // tanggal yang sudah diisi
  missingDays: number; // tanggal yang terlewat (sampai hari ini)
};

// Respons GET /recaps/yearly?year=YYYY
export type YearlyRecap = {
  year: number;
  months: MonthSummary[]; // selalu 12, Januari–Desember
  total: MonthlyRecap["total"] & { recordedDays: number; missingDays: number };
};

export type  DataType = "process" | "packing" | "stock" | "revenue" | "profit"