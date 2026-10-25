import { Prisma } from "../src/generated/prisma/client";
import type { DailyRecap, PriceRate } from "../src/generated/prisma/client";
import { HttpError } from "../src/lib/errors";
import {
  buildMonthlyRecap,
  buildYearlyRecap,
  incomeOf,
  resolveSection,
  resolveSections,
} from "../src/modules/recap/recap.calc";
import { priceAt } from "../src/modules/price-rate/price-rate.calc";

const D = (v: number) => new Prisma.Decimal(v);
const day = (s: string) => new Date(`${s}T00:00:00Z`);

const makeRecap = (date: string, over: Partial<Record<string, number>> = {}): DailyRecap => {
  const v = (k: string) => D(over[k] ?? 0);
  return {
    id: `r-${date}`,
    date: day(date),
    processTotal: v("processTotal"),
    processExport: v("processExport"),
    processLocal: v("processLocal"),
    packingTotal: v("packingTotal"),
    packingExport: v("packingExport"),
    packingLocal: v("packingLocal"),
    stockTotal: v("stockTotal"),
    stockExport: v("stockExport"),
    stockLocal: v("stockLocal"),
    note: null,
    createdAt: day(date),
    updatedAt: day(date),
  };
};

const rate = (effectiveFrom: string, pricePerKg: number): PriceRate => ({
  id: `p-${effectiveFrom}`,
  effectiveFrom: day(effectiveFrom),
  pricePerKg,
  createdAt: day(effectiveFrom),
  updatedAt: day(effectiveFrom),
});

const asNumbers = (r: ReturnType<typeof resolveSection>) => {
  if (!("values" in r)) throw new Error("expected values");
  return {
    total: r.values.total.toNumber(),
    export: r.values.export.toNumber(),
    local: r.values.local.toNumber(),
  };
};

describe("resolveSection", () => {
  // Angka asli PDF 16 Okt: proses total 7.862,3, ekspor 4.355,9, lokal 3.506,4.
  it("total_export: local = total - export, tanpa galat float", () => {
    expect(asNumbers(resolveSection("process", "total_export", { total: 7862.3, export: 4355.9 })))
      .toEqual({ total: 7862.3, export: 4355.9, local: 3506.4 });
  });

  it("total_local: export = total - local", () => {
    expect(asNumbers(resolveSection("process", "total_local", { total: 7862.3, local: 3506.4 })))
      .toEqual({ total: 7862.3, export: 4355.9, local: 3506.4 });
  });

  it("export_local: total = export + local", () => {
    expect(asNumbers(resolveSection("process", "export_local", { export: 4355.9, local: 3506.4 })))
      .toEqual({ total: 7862.3, export: 4355.9, local: 3506.4 });
  });

  it("0.1 + 0.2 tepat 0.3", () => {
    expect(asNumbers(resolveSection("stock", "export_local", { export: 0.1, local: 0.2 })).total).toBe(0.3);
  });

  it("export melebihi total: error di field yang tepat", () => {
    expect(resolveSection("packing", "total_export", { total: 100, export: 100.01 }))
      .toEqual({ errors: { "packing.export": ["exceeds_total"] } });
  });

  it("local melebihi total: error", () => {
    expect(resolveSection("stock", "total_local", { total: 10, local: 11 }))
      .toEqual({ errors: { "stock.local": ["exceeds_total"] } });
  });

  it("export sama dengan total: boleh, local 0", () => {
    expect(asNumbers(resolveSection("process", "total_export", { total: 301, export: 301 })).local).toBe(0);
  });

  it("export + local melebihi batas kolom: error", () => {
    expect(resolveSection("stock", "export_local", { export: 9_999_999_999.99, local: 1 }))
      .toEqual({ errors: { "stock.total": ["exceeds_max"] } });
  });
});

describe("resolveSections", () => {
  it("hanya section yang dikirim yang menghasilkan kolom", () => {
    const cols = resolveSections("export_local", { stock: { export: 19500, local: 13649.8 } });
    expect(Object.keys(cols).sort()).toEqual(["stockExport", "stockLocal", "stockTotal"]);
    expect(cols.stockTotal!.toNumber()).toBe(33149.8);
  });

  it("semua error dikumpulkan dalam satu HttpError 400", () => {
    try {
      resolveSections("total_export", {
        process: { total: 1, export: 2 },
        packing: { total: 5, export: 1 },
        stock: { total: 1, export: 3 },
      });
      throw new Error("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
      expect((e as HttpError).status).toBe(400);
      expect(Object.keys((e as HttpError).fields!).sort()).toEqual(["process.export", "stock.export"]);
    }
  });
});

describe("incomeOf dan priceAt", () => {
  it("kg x harga, dibulatkan ke rupiah", () => {
    expect(incomeOf(D(7862.3), 2500)).toBe(19_655_750);
    expect(incomeOf(D(0.01), 2550)).toBe(26); // 25,5 -> 26
    expect(incomeOf(D(100), null)).toBeNull();
  });

  it("memakai tarif terakhir yang sudah berlaku", () => {
    const rates = [rate("2026-10-01", 2500), rate("2026-11-15", 2700)];
    expect(priceAt(rates, day("2026-09-30"))).toBeNull();
    expect(priceAt(rates, day("2026-10-01"))).toBe(2500);
    expect(priceAt(rates, day("2026-11-14"))).toBe(2500);
    expect(priceAt(rates, day("2026-11-15"))).toBe(2700);
  });
});

describe("buildMonthlyRecap", () => {
  const recaps = [
    makeRecap("2026-10-01", {
      processTotal: 301, processExport: 301,
      packingTotal: 608, packingExport: 608,
      stockTotal: 84332.5, stockExport: 72414, stockLocal: 11918.5,
    }),
    makeRecap("2026-10-03", {
      processTotal: 1191.6, processExport: 1191.6,
      packingTotal: 1320.5, packingExport: 1320.5,
      stockTotal: 53990.9, stockExport: 43512.4, stockLocal: 10478.5,
    }),
  ];
  const rates = [rate("2026-10-01", 2500)];

  it("satu baris per tanggal, termasuk yang belum diinput", () => {
    const m = buildMonthlyRecap("2026-10", recaps, { rates, expenses: [] }, { start: "2026-01-01", today: "2026-10-19" });
    expect(m.days).toHaveLength(31);
    expect(m.days[1]).toEqual({ date: "2026-10-02", recap: null, expense: 0 });
    expect(m.days[0]!.recap!.process).toEqual({ total: 301, export: 301, local: 0 });
  });

  it("proses dan packing dijumlah, sisa memakai tanggal terakhir yang diinput", () => {
    const m = buildMonthlyRecap("2026-10", recaps, { rates, expenses: [] }, { start: "2026-01-01", today: "2026-10-19" });
    expect(m.total.process).toEqual({ total: 1492.6, export: 1492.6, local: 0 });
    expect(m.total.packing.total).toBe(1928.5);
    expect(m.total.stock).toEqual({ total: 53990.9, export: 43512.4, local: 10478.5 });
    expect(m.total.stockDate).toBe("2026-10-03");
  });

  it("missingDates hanya sampai hari ini", () => {
    const m = buildMonthlyRecap("2026-10", recaps, { rates, expenses: [] }, { start: "2026-01-01", today: "2026-10-05" });
    expect(m.missingDates).toEqual(["2026-10-02", "2026-10-04", "2026-10-05"]);
  });

  it("missingDates tidak menghitung hari sebelum rekap pertama di database", () => {
    const m = buildMonthlyRecap("2026-10", recaps, { rates, expenses: [] }, { start: "2026-10-03", today: "2026-10-05" });
    expect(m.missingDates).toEqual(["2026-10-04", "2026-10-05"]);
  });

  it("belum ada rekap sama sekali: tidak ada missingDates", () => {
    const m = buildMonthlyRecap("2026-10", [], { rates, expenses: [] }, { start: null, today: "2026-10-19" });
    expect(m.missingDates).toEqual([]);
  });

  it("bulan kosong: total nol dan stok null", () => {
    const m = buildMonthlyRecap("2026-11", [], { rates, expenses: [] }, { start: "2026-01-01", today: "2026-10-19" });
    expect(m.total.process.total).toBe(0);
    expect(m.total.stock).toBeNull();
    expect(m.missingDates).toEqual([]);
  });

  it("pemasukan per hari dan total bulan", () => {
    const m = buildMonthlyRecap("2026-10", recaps, { rates, expenses: [] }, { start: "2026-01-01", today: "2026-10-19" });
    expect(m.days[0]!.recap!.pricePerKg).toBe(2500);
    expect(m.days[0]!.recap!.income).toBe(752_500);
    expect(m.total.income).toBe(752_500 + 2_979_000);
    expect(m.unpricedDates).toEqual([]);
  });

  it("tanggal sebelum tarif pertama masuk unpricedDates", () => {
    const m = buildMonthlyRecap("2026-10", recaps, { rates: [rate("2026-10-02", 2500)], expenses: [] }, { start: "2026-01-01", today: "2026-10-19" });
    expect(m.days[0]!.recap!.income).toBeNull();
    expect(m.unpricedDates).toEqual(["2026-10-01"]);
    expect(m.total.income).toBe(2_979_000);
  });

  it("tanpa izin keuangan: tidak ada field harga atau pemasukan sama sekali", () => {
    const m = buildMonthlyRecap("2026-10", recaps, null, { start: "2026-01-01", today: "2026-10-19" });
    const json = JSON.stringify(m);
    expect(json).not.toContain("income");
    expect(json).not.toContain("pricePerKg");
    expect(json).not.toContain("unpricedDates");
  });
});

describe("buildYearlyRecap", () => {
  const recaps = [
    makeRecap("2026-09-30", { processTotal: 0.1, processExport: 0.1, stockTotal: 500, stockExport: 500 }),
    makeRecap("2026-10-01", { processTotal: 0.2, processLocal: 0.2, packingTotal: 10, packingExport: 10, stockTotal: 900, stockLocal: 900 }),
    makeRecap("2026-10-16", { processTotal: 7862.3, processExport: 4355.9, processLocal: 3506.4, stockTotal: 33127.4, stockExport: 19477.6, stockLocal: 13649.8 }),
  ];
  // Tarif naik di tengah tahun: September belum ada tarif, Oktober 2.500.
  const rates = [rate("2026-10-01", 2500)];
  const y = buildYearlyRecap(2026, recaps, { rates, expenses: [] }, { start: "2026-09-30", today: "2026-10-19" });

  it("12 bulan, tiap bulan memakai aturan TOTAL bulanan", () => {
    expect(y.months.map((m) => m.month)).toEqual(
      Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`),
    );
    const okt = y.months[9]!;
    expect(okt.recordedDays).toBe(2);
    expect(okt.missingDays).toBe(17); // 1-19 Okt dikurangi 2 tanggal terisi
    expect(okt.process).toEqual({ total: 7862.5, export: 4355.9, local: 3506.6 });
    expect(okt.stock).toEqual({ total: 33127.4, export: 19477.6, local: 13649.8 });
    expect(okt.stockDate).toBe("2026-10-16");
    expect(okt.income).toBe(19_656_250);
  });

  it("bulan tanpa data: nol dan stok null; bulan depan tidak dihitung belum diinput", () => {
    expect(y.months[10]).toMatchObject({ recordedDays: 0, missingDays: 0, stock: null, income: 0 });
    expect(y.months[10]!.process.total).toBe(0);
  });

  it("total tahun: dijumlah tanpa galat float, sisa dari tanggal terakhir di tahun itu", () => {
    expect(y.total.process.total).toBe(7862.6); // 0.1 + 7862.5
    expect(y.total.packing.total).toBe(10);
    expect(y.total.stockDate).toBe("2026-10-16");
    expect(y.total.recordedDays).toBe(3);
    expect(y.total.income).toBe(19_656_250); // September belum ada tarif
  });

  it("missingDays tahun: dari rekap pertama (30 Sep) sampai hari ini", () => {
    // 30 Sep - 19 Okt = 20 hari, terisi 3.
    expect(y.months[7]!.missingDays).toBe(0);
    expect(y.months[8]!.missingDays).toBe(0);
    expect(y.total.missingDays).toBe(17);
  });

  it("tanpa izin keuangan: tidak ada field pemasukan", () => {
    const json = JSON.stringify(buildYearlyRecap(2026, recaps, null, { start: "2026-01-01", today: "2026-10-19" }));
    expect(json).not.toMatch(/income|pricePerKg|unpricedDates/);
  });
});

describe("pengeluaran dan laba di rekap", () => {
  const exp = (date: string, category: string, amount: number) => ({ date: day(date), category, amount });
  const recaps = [makeRecap("2026-10-01", { processTotal: 100, processExport: 100 })]; // pemasukan 250.000
  const finance = {
    rates: [rate("2026-10-01", 2500)],
    expenses: [
      exp("2026-10-01", "Solar", 50_000),
      exp("2026-10-01", "Listrik", 30_000),
      exp("2026-10-02", "Solar", 70_000), // tanggal tanpa rekap
      exp("2026-11-01", "Solar", 999_999), // bulan lain, diabaikan
    ],
  };
  const window = { start: "2026-10-01", today: "2026-10-19" };

  it("pengeluaran per tanggal, termasuk tanggal tanpa rekap", () => {
    const m = buildMonthlyRecap("2026-10", recaps, finance, window);
    expect(m.days[0]!.expense).toBe(80_000);
    expect(m.days[1]).toEqual({ date: "2026-10-02", recap: null, expense: 70_000 });
    expect(m.days[2]!.expense).toBe(0);
  });

  it("total: pengeluaran, laba = pemasukan - pengeluaran, dan rekap per kategori", () => {
    const m = buildMonthlyRecap("2026-10", recaps, finance, window);
    expect(m.total).toMatchObject({ income: 250_000, expense: 150_000, profit: 100_000 });
    expect(m.expenseByCategory).toEqual([
      { category: "Solar", total: 120_000, count: 2 },
      { category: "Listrik", total: 30_000, count: 1 },
    ]);
  });

  it("laba bisa negatif", () => {
    const m = buildMonthlyRecap("2026-10", [], finance, window);
    expect(m.total.profit).toBe(-150_000);
  });

  it("tahunan: pengeluaran dan laba dijumlah semua bulan", () => {
    const y = buildYearlyRecap(2026, recaps, finance, window);
    expect(y.months[9]).toMatchObject({ expense: 150_000, profit: 100_000 });
    expect(y.months[10]).toMatchObject({ income: 0, expense: 999_999, profit: -999_999 });
    expect(y.total).toMatchObject({ income: 250_000, expense: 1_149_999, profit: -899_999 });
  });

  it("tanpa izin keuangan: tidak ada field pengeluaran atau laba", () => {
    const json = JSON.stringify([
      buildMonthlyRecap("2026-10", recaps, null, window),
      buildYearlyRecap(2026, recaps, null, window),
    ]);
    expect(json).not.toMatch(/expense|profit|income/);
  });
});
