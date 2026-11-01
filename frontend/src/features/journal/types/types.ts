// Sesuai respons /journals (backend journal.service.ts).

export const JOURNAL_SECTIONS = ["PROCESS", "PACKING", "STOCK", "OUT"] as const;
export type JournalSection = (typeof JOURNAL_SECTIONS)[number];

// Bagian yang diisi lewat import Excel. Barang keluar (OUT) diisi manual.
export type ImportSection = Exclude<JournalSection, "OUT">;

export const MARKETS = ["EXPORT", "LOCAL"] as const;
export type Market = (typeof MARKETS)[number];

export type JournalEntry = {
  id: string;
  section: JournalSection;
  party: string; // supplier, atau pelanggan untuk barang keluar
  item: string;
  size: string | null;
  mc: number | null;
  kg: number;
  market: Market;
};

export type JournalDay = { date: string; entries: JournalEntry[] };

export type SectionSummary = { rows: number; kg: number };

export type JournalMonth = {
  month: string;
  days: { date: string; sections: Partial<Record<JournalSection, SectionSummary>> }[];
};

// ---------- Import ----------

export type ImportEntry = {
  key: string; // kunci stabil baris di file, untuk label pasar per baris
  date: string;
  section: ImportSection;
  party: string;
  item: string;
  size: string | null;
  mc: number | null;
  kg: number;
  position: number;
};

export type ImportPreview = {
  dryRun: boolean;
  dates: { date: string; sheet: string; replaces: boolean; sections: Record<ImportSection, SectionSummary> }[];
  // market null = supplier baru, wajib dipilih sebelum menyimpan.
  suppliers: { name: string; rows: number; market: Market | null }[];
  entries?: ImportEntry[];
  saved?: { removed: number; created: number };
};

export type ImportMarkets = {
  suppliers: Record<string, Market>;
  rows: Record<string, Market>;
};
