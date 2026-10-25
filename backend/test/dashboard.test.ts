import { Prisma } from "../src/generated/prisma/client";
import type { DailyRecap, PriceRate } from "../src/generated/prisma/client";
import {
  buildDailyTrend,
  buildDashboardSummary,
  buildMonthlyTrend,
  changePct,
  sharePct,
} from "../src/modules/dashboard/dashboard.calc";

const D = (v: number) => new Prisma.Decimal(v);
const day = (s: string) => new Date(`${s}T00:00:00Z`);

// Rekap sederhana: proses total = ekspor + lokal, packing dan sisa ikut proses agar mudah dihitung.
const recap = (date: string, exp: number, local = 0): DailyRecap => ({
  id: date,
  date: day(date),
  processTotal: D(exp + local), processExport: D(exp), processLocal: D(local),
  packingTotal: D(exp), packingExport: D(exp), packingLocal: D(0),
  stockTotal: D(exp * 10), stockExport: D(exp * 5), stockLocal: D(exp * 5),
  note: null,
  createdAt: day(date),
  updatedAt: day(date),
});

const RATES: PriceRate[] = [
  { id: "r", effectiveFrom: day("2026-01-01"), pricePerKg: 2500, createdAt: day("2026-01-01"), updatedAt: day("2026-01-01") },
];
const FIN = { rates: RATES, expenses: [] };

describe("changePct dan sharePct", () => {
  it("1 desimal, null kalau pembagi 0", () => {
    expect(changePct(240, 200)).toBe(20);
    expect(changePct(100, 300)).toBe(-66.7);
    expect(changePct(5, 0)).toBeNull();
    expect(sharePct(4355.9, 7862.3)).toBe(55.4);
    expect(sharePct(0, 0)).toBeNull();
  });
});

describe("buildDashboardSummary", () => {
  const recaps = [
    recap("2026-09-01", 100),
    recap("2026-09-16", 100),
    recap("2026-09-20", 500), // di luar periode pembanding untuk bulan berjalan
    recap("2026-10-01", 100, 50),
    recap("2026-10-16", 90),
  ];
  const window = { start: "2026-09-01", today: "2026-10-16" };

  it("bulan berjalan dibandingkan dengan bulan lalu pada tanggal yang sama", () => {
    const s = buildDashboardSummary("2026-10", recaps, FIN, window);
    expect(s.asOf).toBe("2026-10-16");
    expect(s.current.process.total).toBe(240);
    expect(s.previous.period).toEqual({ from: "2026-09-01", to: "2026-09-16" });
    expect(s.previous.process.total).toBe(200);
    // Tanpa pengeluaran: laba = pemasukan, perubahan pengeluaran tidak bisa dihitung (0 -> 0).
    expect(s.change).toEqual({ process: 20, packing: -5, income: 20, expense: null, profit: 20 });
  });

  it("porsi ekspor, rata-rata proses per hari, dan sisa terakhir", () => {
    const s = buildDashboardSummary("2026-10", recaps, FIN, window);
    expect(s.exportShare.process).toBe(79.2); // 190 / 240
    expect(s.exportShare.stock).toBe(50);
    expect(s.averageProcessPerDay).toBe(120);
    expect(s.current.stockDate).toBe("2026-10-16");
  });

  it("hari kosong bulan lalu hanya dihitung dalam periode pembanding", () => {
    const s = buildDashboardSummary("2026-10", recaps, FIN, window);
    expect(s.previous.missingDays).toBe(14); // 1-16 Sep, terisi 2
    expect(s.current.missingDays).toBe(14); // 1-16 Okt, terisi 2
  });

  it("bulan yang sudah selesai dibandingkan dengan bulan lalu secara penuh", () => {
    const s = buildDashboardSummary("2026-09", [recap("2026-08-31", 100), recap("2026-09-30", 100)], FIN, {
      start: "2026-08-01",
      today: "2026-10-16",
    });
    expect(s.asOf).toBe("2026-09-30");
    expect(s.previous.period).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    expect(s.previous.process.total).toBe(100);
    expect(s.change.process).toBe(0);
  });

  it("bulan yang belum dimulai: kosong, tanpa pembanding", () => {
    const s = buildDashboardSummary("2026-11", recaps, FIN, window);
    expect(s.asOf).toBeNull();
    expect(s.previous.period).toBeNull();
    expect(s.current.recordedDays).toBe(0);
    expect(s.change.process).toBeNull();
    expect(s.averageProcessPerDay).toBeNull();
  });

  it("tanpa izin keuangan: tidak ada field pemasukan", () => {
    const json = JSON.stringify(buildDashboardSummary("2026-10", recaps, null, window));
    expect(json).not.toMatch(/income/);
  });
});

describe("tren", () => {
  const recaps = [recap("2026-09-01", 100), recap("2026-10-16", 90)];
  const window = { start: "2026-09-01", today: "2026-10-16" };

  it("harian: tanggal tanpa rekap bernilai null, bukan 0", () => {
    const t = buildDailyTrend("2026-10", recaps.slice(1), FIN, window);
    expect(t.days).toHaveLength(31);
    expect(t.days[0]).toMatchObject({ date: "2026-10-01", recorded: false, processExport: null, income: null });
    expect(t.days[15]).toMatchObject({ recorded: true, processExport: 90, processLocal: 0, income: 225_000 });
  });

  it("bulanan: berurutan dan menyeberang tahun", () => {
    const t = buildMonthlyTrend(["2025-12", "2026-01", "2026-09", "2026-10"], recaps, null, window);
    expect(t.from).toBe("2025-12");
    expect(t.to).toBe("2026-10");
    expect(t.months.map((m) => m.process.total)).toEqual([0, 0, 100, 90]);
    expect(JSON.stringify(t)).not.toMatch(/income/);
  });
});

describe("pengeluaran di dashboard", () => {
  const exp = (date: string, amount: number) => ({ date: day(date), category: "Solar", amount });
  const recaps = [recap("2026-09-01", 100), recap("2026-10-01", 100)]; // pemasukan 250.000 per bulan
  const window = { start: "2026-09-01", today: "2026-10-16" };
  const finance = {
    rates: RATES,
    expenses: [
      exp("2026-09-02", 50_000),
      exp("2026-09-20", 999_000), // di luar periode pembanding (1-16 Sep)
      exp("2026-10-03", 100_000),
      exp("2026-10-20", 777_000), // setelah hari ini
    ],
  };

  it("summary: perubahan pengeluaran dan laba pada periode yang sama", () => {
    const s = buildDashboardSummary("2026-10", recaps, finance, window);
    expect(s.current).toMatchObject({ income: 250_000, expense: 100_000, profit: 150_000 });
    expect(s.previous).toMatchObject({ income: 250_000, expense: 50_000, profit: 200_000 });
    expect(s.change).toMatchObject({ income: 0, expense: 100, profit: -25 });
  });

  it("tren harian: pengeluaran selalu angka, 0 kalau tidak ada", () => {
    const t = buildDailyTrend("2026-10", recaps.slice(1), finance, window);
    expect(t.days[2]).toMatchObject({ recorded: false, income: null, expense: 100_000 });
    expect(t.days[3]!.expense).toBe(0);
  });

  it("tren bulanan: laba per bulan", () => {
    const t = buildMonthlyTrend(["2026-09", "2026-10"], recaps, finance, window);
    expect(t.months.map((m) => m.profit)).toEqual([250_000 - 1_049_000, 250_000 - 877_000]);
  });
});
