import type { MonthSummary } from "@/features/recap/types/types";

// Sesuai backend dashboard.calc.ts. Field keuangan hanya dikirim untuk OWNER/ADMIN (finance:read).

export type DashboardSummary = {
  month: string; // "2026-10"
  // Data dihitung sampai tanggal ini; null = bulan belum dimulai.
  asOf: string | null;
  current: MonthSummary;
  // Bulan lalu pada periode yang sama panjang (tanggal 1 s/d tanggal asOf).
  previous: MonthSummary & { period: { from: string; to: string } | null };
  // Persen perubahan; null = pembanding 0 (tidak bisa dihitung).
  change: {
    process: number | null;
    packing: number | null;
    income?: number | null;
    expense?: number | null;
    profit?: number | null;
  };
  exportShare: { process: number | null; packing: number | null; stock: number | null };
  averageProcessPerDay: number | null;
};

// Tanggal tanpa rekap bernilai null (celah di grafik), bukan 0.
export type DailyPoint = {
  date: string;
  recorded: boolean;
  processExport: number | null;
  processLocal: number | null;
  packingExport: number | null;
  packingLocal: number | null;
  stockExport: number | null;
  stockLocal: number | null;
  income?: number | null;
  expense?: number;
};

export type DailyTrend = { month: string; days: DailyPoint[] };

export type MonthlyTrend = { from: string; to: string; months: MonthSummary[] };
