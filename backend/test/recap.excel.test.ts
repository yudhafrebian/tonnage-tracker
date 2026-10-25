import path from "path";
import ExcelJS from "exceljs";
import { Prisma } from "../src/generated/prisma/client";
import type { DailyRecap } from "../src/generated/prisma/client";
import { buildMonthlyRecap, resolveSections } from "../src/modules/recap/recap.calc";
import {
  buildRecapWorkbook,
  buildTemplateWorkbook,
  parseRecapWorkbook,
  readWorkbook,
  sheetNameFor,
  type ParsedRow,
} from "../src/modules/recap/recap.excel";

const ASSET = path.join(__dirname, "..", "assets", "Data Global Oktober 2026.xlsx");

const loadAsset = async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ASSET);
  return wb;
};

const okRows = (r: ReturnType<typeof parseRecapWorkbook>): ParsedRow[] => {
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.rows;
};

// Workbook kecil dengan format REKAP: baris 1-2 judul, data mulai baris 3.
const makeSheet = (name: string, rows: (string | number | null)[][]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(name);
  ws.getCell("A1").value = "Tanggal";
  rows.forEach((values, i) => {
    values.forEach((v, c) => {
      if (v !== null) ws.getRow(3 + i).getCell(c + 1).value = v;
    });
  });
  return wb;
};

describe("parseRecapWorkbook: file Oktober asli", () => {
  let rows: ParsedRow[];
  beforeAll(async () => {
    rows = okRows(parseRecapWorkbook(await loadAsset(), "2026-10"));
  });

  it("16 tanggal terisi, 17-31 dilewati", () => {
    expect(rows).toHaveLength(16);
    expect(rows[0]!.date).toBe("2026-10-01");
    expect(rows[15]!.date).toBe("2026-10-16");
  });

  it("angka sesuai sheet REKAP OKT", () => {
    expect(rows[0]).toEqual({
      date: "2026-10-01",
      process: { export: 301, local: 0 },
      packing: { export: 608, local: 0 },
      stock: { export: 72414, local: 11918.5 },
    });
    expect(rows[15]).toEqual({
      date: "2026-10-16",
      process: { export: 4355.9, local: 3506.4 },
      packing: { export: 1722, local: 2917.9 },
      stock: { export: 19477.6, local: 13649.8 },
    });
  });

  it("sel rumus tanpa hasil tersimpan dianggap 0 (proses ekspor tgl 12)", () => {
    expect(rows[11]!.process).toEqual({ export: 0, local: 220.9 });
  });

  it("total bulan sama dengan baris TOTAL di Excel", () => {
    const sum = (f: (r: ParsedRow) => number) =>
      rows.reduce((a, r) => a.plus(f(r)), new Prisma.Decimal(0)).toNumber();
    expect(sum((r) => r.process.export)).toBe(23711.4);
    expect(sum((r) => r.packing.export)).toBe(30064.1);
    expect(sum((r) => r.process.local)).toBe(9970.9);
    expect(sum((r) => r.packing.local)).toBe(6734.2);
  });

  it("file Oktober ditolak untuk bulan September", async () => {
    const r = parseRecapWorkbook(await loadAsset(), "2026-09");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]!.message).toContain('expected "REKAP SEP"');
  });
});

describe("parseRecapWorkbook: validasi", () => {
  it("tanpa sheet REKAP: error", () => {
    const r = parseRecapWorkbook(makeSheet("Sheet1", []), "2026-10");
    expect(r).toEqual({
      ok: false,
      errors: [{ row: 0, code: "sheet_missing", params: {}, message: 'No sheet named "REKAP <MONTH>" found' }],
    });
  });

  it("nilai negatif, teks, dan tanggal di luar bulan: semua error dikumpulkan", () => {
    const r = parseRecapWorkbook(
      makeSheet("REKAP NOV", [
        [1, 10, 0, 5, null, -2, 0, 1],
        [2, "abc", 0, 0, null, 0, 0, 0],
        [31, 1, 1, 1, null, 1, 1, 1],
      ]),
      "2026-11",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.map((e) => e.row)).toEqual([3, 4, 5]);
      expect(r.errors[0]!.message).toContain("F3: negative value");
      expect(r.errors[1]!.message).toContain('"abc" is not a number');
      expect(r.errors[2]!.message).toContain("Day 31 does not exist in 2026-11");
      expect(r.errors.map((e) => [e.code, e.params])).toEqual([
        ["negative_value", { cell: "F3", value: -2 }],
        ["not_a_number", { cell: "B4", value: "abc" }],
        ["day_out_of_month", { day: 31, month: "2026-11" }],
      ]);
    }
  });

  it("tanggal dobel: error", () => {
    const r = parseRecapWorkbook(
      makeSheet("REKAP NOV", [
        [1, 1, 1, 1, null, 1, 1, 1],
        [1, 2, 2, 2, null, 2, 2, 2],
      ]),
      "2026-11",
    );
    expect(r.ok).toBe(false);
  });

  it("galat float dari rumus dibulatkan ke 2 desimal, berhenti di baris TOTAL", () => {
    const rows = okRows(
      parseRecapWorkbook(
        makeSheet("REKAP NOV", [
          [1, 4355.9, 0, 0, null, 3506.3999999999996, 0, 0],
          ["TOTAL", 999, 999, 999, null, 999, 999, 999],
          [2, 1, 1, 1, null, 1, 1, 1],
        ]),
        "2026-11",
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.process.local).toBe(3506.4);
  });

  it("singkatan Agustus AGS dikenali", () => {
    const rows = okRows(parseRecapWorkbook(makeSheet("REKAP AGS", [[1, 1, 0, 0, null, 0, 0, 0]]), "2026-08"));
    expect(rows).toHaveLength(1);
  });
});

describe("export -> import (round-trip)", () => {
  const toRecap = (row: ParsedRow): DailyRecap => {
    const cols = resolveSections("export_local", row);
    const D = (k: keyof typeof cols) => cols[k]!;
    return {
      id: row.date,
      date: new Date(`${row.date}T00:00:00Z`),
      processTotal: D("processTotal"), processExport: D("processExport"), processLocal: D("processLocal"),
      packingTotal: D("packingTotal"), packingExport: D("packingExport"), packingLocal: D("packingLocal"),
      stockTotal: D("stockTotal"), stockExport: D("stockExport"), stockLocal: D("stockLocal"),
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  it.each([true, false])("hasil export bisa diimport ulang tanpa perubahan (finance=%s)", async (finance) => {
    const original = okRows(parseRecapWorkbook(await loadAsset(), "2026-10"));
    const rate = { id: "r", effectiveFrom: new Date("2026-10-01T00:00:00Z"), pricePerKg: 2500, createdAt: new Date(), updatedAt: new Date() };
    const monthly = buildMonthlyRecap("2026-10", original.map(toRecap), finance ? { rates: [rate], expenses: [] } : null, { start: "2026-01-01", today: "2026-10-19" });
    const wb = buildRecapWorkbook(monthly, finance ? [] : null);
    expect(wb.worksheets[0]!.name).toBe(sheetNameFor("2026-10"));

    const reread = await readWorkbook(Buffer.from(await wb.xlsx.writeBuffer()));
    expect(okRows(parseRecapWorkbook(reread, "2026-10"))).toEqual(original);
  });

  it("dengan pengeluaran: kolom pengeluaran/laba, sheet PENGELUARAN, dan tetap bisa diimport ulang", async () => {
    const original = okRows(parseRecapWorkbook(await loadAsset(), "2026-10"));
    const rate = { id: "r", effectiveFrom: new Date("2026-10-01T00:00:00Z"), pricePerKg: 2500, createdAt: new Date(), updatedAt: new Date() };
    const expenses = [
      { date: "2026-10-01", category: "Solar", amount: 52_500, note: "kapal 2" },
      { date: "2026-10-17", category: "Listrik", amount: 100_000, note: null },
    ];
    const monthly = buildMonthlyRecap(
      "2026-10",
      original.map(toRecap),
      { rates: [rate], expenses: expenses.map((e) => ({ ...e, date: new Date(`${e.date}T00:00:00Z`) })) },
      { start: "2026-10-01", today: "2026-10-19" },
    );
    const wb = buildRecapWorkbook(monthly, expenses);
    const rekap = wb.getWorksheet("REKAP OKT")!;
    expect(rekap.getCell("L3").value).toBe(52_500);
    expect(rekap.getCell("M3").value).toBe(752_500 - 52_500);
    // Tanggal 17 tanpa rekap tapi ada pengeluaran: laba negatif, kolom kg tetap kosong.
    expect(rekap.getCell("B19").value).toBeNull();
    expect(rekap.getCell("M19").value).toBe(-100_000);
    expect((rekap.getCell("M34").value as { result: number }).result).toBe(84_205_750 - 152_500);

    const sheet = wb.getWorksheet("PENGELUARAN OKT")!;
    expect(sheet.getCell("B2").value).toBe("Solar");
    expect((sheet.getCell("C4").value as { result: number }).result).toBe(152_500);

    const reread = await readWorkbook(Buffer.from(await wb.xlsx.writeBuffer()));
    expect(okRows(parseRecapWorkbook(reread, "2026-10"))).toEqual(original);
  });

  it("kolom pemasukan hanya ada untuk pengguna dengan izin keuangan", () => {
    const monthly = buildMonthlyRecap("2026-10", [], null, { start: "2026-01-01", today: "2026-10-19" });
    const ws = buildRecapWorkbook(monthly, null).worksheets[0]!;
    expect(ws.getCell("K2").value).toBeNull();
  });
});

describe("template import", () => {
  it("sheet kosong sesuai bulan: tanggal 1..akhir bulan, tanpa kolom keuangan", async () => {
    const ws = buildTemplateWorkbook("2026-02").worksheets[0]!;
    expect(ws.name).toBe("REKAP FEB");
    expect(ws.getCell("A3").value).toBe(1);
    expect(ws.getCell("A30").value).toBe(28);
    expect(ws.getCell("A31").value).toBe("TOTAL");
    expect(ws.getCell("J2").value).toBeNull();

    const reread = await readWorkbook(Buffer.from(await ws.workbook.xlsx.writeBuffer()));
    expect(okRows(parseRecapWorkbook(reread, "2026-02"))).toEqual([]);
  });

  it("template yang sudah diisi bisa diimport", async () => {
    const wb = buildTemplateWorkbook("2026-10");
    const row = wb.worksheets[0]!.getRow(7); // tanggal 5
    [4355.9, 1722, 19477.6].forEach((v, i) => (row.getCell(2 + i).value = v));
    [3506.4, 2917.9, 13649.8].forEach((v, i) => (row.getCell(6 + i).value = v));

    const reread = await readWorkbook(Buffer.from(await wb.xlsx.writeBuffer()));
    expect(okRows(parseRecapWorkbook(reread, "2026-10"))).toEqual([
      {
        date: "2026-10-05",
        process: { export: 4355.9, local: 3506.4 },
        packing: { export: 1722, local: 2917.9 },
        stock: { export: 19477.6, local: 13649.8 },
      },
    ]);
  });
});
