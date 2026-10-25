import ExcelJS from "exceljs";
import { Prisma } from "../../generated/prisma/client";
import type { DailyRecap } from "../../generated/prisma/client";
import { datesInMonth, daysInMonth } from "../../lib/date";
import { MAX_KG } from "../../lib/validators";
import type { MonthlyRecap } from "./recap.calc";
import { SECTIONS, type SectionName } from "./recap.schema";

// Format sheet mengikuti "REKAP OKT" di Excel admin:
//   A = tanggal (1..31), B/C/D = Ekspor proses/packing/sisa, E kosong, F/G/H = Lokal proses/packing/sisa.
//   Baris 1-2 judul, data mulai baris 3, diakhiri baris "TOTAL".
const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
// Singkatan lain yang biasa dipakai untuk Agustus.
const MONTH_ALIASES: Record<string, number> = { AGS: 8, AGT: 8 };

const EXPORT_COLS: Record<SectionName, number> = { process: 2, packing: 3, stock: 4 };
const LOCAL_COLS: Record<SectionName, number> = { process: 6, packing: 7, stock: 8 };
const FIRST_DATA_ROW = 3;

export const sheetNameFor = (month: string) =>
  `REKAP ${MONTH_ABBR[Number(month.slice(5, 7)) - 1]}`;

// "REKAP OKT" -> 10, "REKAP AGS" -> 8, nama lain -> null.
const monthOfSheetName = (name: string): number | null => {
  const abbr = name.trim().toUpperCase().replace(/^REKAP\s+/, "").split(/\s+/)[0] ?? "";
  const idx = MONTH_ABBR.indexOf(abbr);
  return idx >= 0 ? idx + 1 : (MONTH_ALIASES[abbr] ?? null);
};

export type ParsedRow = {
  date: string;
  process: { export: number; local: number };
  packing: { export: number; local: number };
  stock: { export: number; local: number };
};

// `code` + `params` diterjemahkan di frontend; `message` bahasa Inggris sebagai fallback.
export type ParseErrorCode =
  | "sheet_missing"
  | "sheet_wrong_month"
  | "sheet_not_found"
  | "invalid_day"
  | "day_out_of_month"
  | "duplicate_day"
  | "not_a_number"
  | "excel_error"
  | "negative_value"
  | "value_too_large";

type Params = Record<string, string | number>;

export type ParseError = { row: number; code: ParseErrorCode; params: Params; message: string };

const MESSAGES: Record<ParseErrorCode, (p: Params) => string> = {
  sheet_missing: () => 'No sheet named "REKAP <MONTH>" found',
  sheet_wrong_month: (p) => `Sheet "${p.sheet}" is not for month ${p.month} (expected "${p.expected}")`,
  sheet_not_found: (p) => `Sheet "${p.expected}" not found`,
  invalid_day: (p) => `Column A must be a day number, got "${p.value}"`,
  day_out_of_month: (p) => `Day ${p.day} does not exist in ${p.month}`,
  duplicate_day: (p) => `Day ${p.day} appears more than once`,
  not_a_number: (p) => `${p.cell}: "${p.value}" is not a number`,
  excel_error: (p) => `${p.cell}: Excel error ${p.error}`,
  negative_value: (p) => `${p.cell}: negative value ${p.value} (export larger than total?)`,
  value_too_large: (p) => `${p.cell}: value too large`,
};

const parseError = (row: number, code: ParseErrorCode, params: Params = {}): ParseError => ({
  row,
  code,
  params,
  message: MESSAGES[code](params),
});

export type ParseResult =
  | { ok: true; sheetName: string; rows: ParsedRow[] }
  | { ok: false; errors: ParseError[] };

type CellError = { code: "not_a_number" | "excel_error"; params: Params };
type CellNumber = { value: number | null } | { error: CellError };

// Mengambil angka dari sel: angka biasa, atau hasil rumus yang tersimpan di file.
// Rumus tanpa hasil tersimpan (Excel tidak menyimpan hasil 0 di sel kosong) dianggap kosong.
function readNumber(v: ExcelJS.CellValue): CellNumber {
  if (v === null || v === undefined) return { value: null };
  if (typeof v === "number") return { value: v };
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "" || s === "-") return { value: null };
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? { value: n } : { error: { code: "not_a_number", params: { value: s } } };
  }
  if (typeof v === "object") {
    if ("error" in v) return { error: { code: "excel_error", params: { error: String(v.error) } } };
    if ("result" in v || "formula" in v || "sharedFormula" in v) {
      return readNumber((v as { result?: ExcelJS.CellValue }).result);
    }
  }
  return { error: { code: "not_a_number", params: { value: String(v) } } };
}

const round2 = (n: number) =>
  new Prisma.Decimal(n).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber();

function findRecapSheet(wb: ExcelJS.Workbook, month: string): ExcelJS.Worksheet | ParseError {
  const wanted = Number(month.slice(5, 7));
  const sheets = wb.worksheets.filter((ws) => /^REKAP\b/i.test(ws.name.trim()));
  if (sheets.length === 0) return parseError(0, "sheet_missing");
  const matching = sheets.find((ws) => monthOfSheetName(ws.name) === wanted);
  if (matching) return matching;
  if (sheets.length === 1) {
    const ws = sheets[0]!;
    const found = monthOfSheetName(ws.name);
    // Mencegah file bulan lain terimport ke bulan yang salah.
    if (found !== null) {
      return parseError(0, "sheet_wrong_month", { sheet: ws.name, month, expected: sheetNameFor(month) });
    }
    return ws;
  }
  return parseError(0, "sheet_not_found", { expected: sheetNameFor(month) });
}

export function parseRecapWorkbook(wb: ExcelJS.Workbook, month: string): ParseResult {
  const sheet = findRecapSheet(wb, month);
  if (!("getRow" in sheet)) return { ok: false, errors: [sheet] };

  const lastDay = daysInMonth(month);
  const rows: ParsedRow[] = [];
  const errors: ParseError[] = [];
  const seen = new Set<number>();

  for (let r = FIRST_DATA_ROW; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const label = row.getCell(1).value;
    if (typeof label === "string" && label.trim().toUpperCase() === "TOTAL") break;
    if (label === null || label === undefined || label === "") continue;

    const dayNum = readNumber(label);
    if (!("value" in dayNum) || dayNum.value === null || !Number.isInteger(dayNum.value)) {
      errors.push(parseError(r, "invalid_day", { value: String(label) }));
      continue;
    }
    const d = dayNum.value;
    if (d < 1 || d > lastDay) {
      errors.push(parseError(r, "day_out_of_month", { day: d, month }));
      continue;
    }
    if (seen.has(d)) {
      errors.push(parseError(r, "duplicate_day", { day: d }));
      continue;
    }
    seen.add(d);

    const values = {} as Record<SectionName, { export: number | null; local: number | null }>;
    let rowHasError = false;
    for (const name of SECTIONS) {
      const pair = { export: null as number | null, local: null as number | null };
      for (const [field, col] of [["export", EXPORT_COLS[name]], ["local", LOCAL_COLS[name]]] as const) {
        const cell = readNumber(row.getCell(col).value);
        const ref = row.getCell(col).address;
        if ("error" in cell) {
          errors.push(parseError(r, cell.error.code, { cell: ref, ...cell.error.params }));
          rowHasError = true;
          continue;
        }
        if (cell.value === null) continue;
        // Hasil rumus Excel sering membawa galat float (3506.3999999), jadi dibulatkan ke 2 desimal.
        const v = round2(cell.value);
        if (v < 0) {
          errors.push(parseError(r, "negative_value", { cell: ref, value: v }));
          rowHasError = true;
          continue;
        }
        if (v > MAX_KG) {
          errors.push(parseError(r, "value_too_large", { cell: ref }));
          rowHasError = true;
          continue;
        }
        pair[field] = v;
      }
      values[name] = pair;
    }
    if (rowHasError) continue;

    // Baris tanggal tanpa angka sama sekali berarti belum diinput, bukan nol.
    const allEmpty = SECTIONS.every((n) => values[n].export === null && values[n].local === null);
    if (allEmpty) continue;

    const filled = (n: SectionName) => ({ export: values[n].export ?? 0, local: values[n].local ?? 0 });
    rows.push({
      date: `${month}-${String(d).padStart(2, "0")}`,
      process: filled("process"),
      packing: filled("packing"),
      stock: filled("stock"),
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, sheetName: sheet.name, rows };
}

export async function readWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  // exceljs mengetik parameter load sebagai Buffer lama; Buffer Node modern kompatibel saat runtime.
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}

export type ImportAction = "create" | "update" | "skip" | "unchanged";

const COLUMNS = SECTIONS.flatMap((s) => [`${s}Total`, `${s}Export`, `${s}Local`] as const);

// true kalau kolom angka rekap yang tersimpan sama persis dengan hasil import.
export const sameValues = (existing: DailyRecap, columns: Partial<Record<(typeof COLUMNS)[number], Prisma.Decimal>>) =>
  COLUMNS.every((c) => columns[c] === undefined || existing[c].eq(columns[c]!));

// ---------- Export ----------

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB6DDE8" } };
const SUBHEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F81BD" } };
const TOTAL_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF3" } };
const KG_FORMAT = "#,##0.0";
const RUPIAH_FORMAT = "#,##0";

// Baris pengeluaran untuk sheet PENGELUARAN di file export.
export type ExpenseRow = { date: string; category: string; amount: number; note: string | null };

const FINANCE_COLS = { price: 10, income: 11, expense: 12, profit: 13 } as const;

const styleHeader = (ws: ExcelJS.Worksheet, refs: string[]) => {
  for (const ref of refs) {
    const c = ws.getCell(ref);
    c.fill = HEADER_FILL;
    c.font = { bold: true, name: "Arial", size: 10 };
    c.alignment = { horizontal: "center", vertical: "middle" };
  }
};

const styleSubheader = (ws: ExcelJS.Worksheet, refs: string[]) => {
  for (const ref of refs) {
    const c = ws.getCell(ref);
    c.fill = SUBHEADER_FILL;
    c.font = { bold: true, name: "Arial", size: 10, color: { argb: "FFFFFFFF" } };
    c.alignment = { horizontal: "center" };
  }
};

// `expenses` null = pengguna tanpa izin keuangan: kolom dan sheet keuangan tidak dibuat.
export function buildRecapWorkbook(m: MonthlyRecap, expenses: ExpenseRow[] | null): ExcelJS.Workbook {
  const finance = expenses !== null;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetNameFor(m.month), { views: [{ state: "frozen", ySplit: 2 }] });
  ws.columns = [8.5, 12, 12, 12, 2, 12, 12, 12, ...(finance ? [2, 10, 15, 15, 15] : [])].map((width) => ({ width }));

  ws.getCell("A1").value = "Tanggal";
  ws.mergeCells("A1:A2");
  ws.getCell("B1").value = "Ekspor (kg)";
  ws.mergeCells("B1:D1");
  ws.getCell("F1").value = "Lokal (kg)";
  ws.mergeCells("F1:H1");
  const subheaders: [string, string][] = [
    ["B2", "Proses"], ["C2", "Packing"], ["D2", "Sisa"],
    ["F2", "Proses"], ["G2", "Packing"], ["H2", "Sisa"],
  ];
  if (finance) {
    ws.getCell("J1").value = "Keuangan";
    ws.mergeCells("J1:M1");
    subheaders.push(["J2", "Harga/kg"], ["K2", "Pemasukan (Rp)"], ["L2", "Pengeluaran (Rp)"], ["M2", "Laba (Rp)"]);
  }
  for (const [ref, text] of subheaders) ws.getCell(ref).value = text;
  styleHeader(ws, ["A1", "B1", "F1", ...(finance ? ["J1"] : [])]);
  styleSubheader(ws, subheaders.map(([ref]) => ref));

  m.days.forEach((day, i) => {
    const row = ws.getRow(FIRST_DATA_ROW + i);
    row.getCell(1).value = i + 1;
    const r = day.recap;
    if (r) {
      for (const name of SECTIONS) {
        row.getCell(EXPORT_COLS[name]).value = r[name].export;
        row.getCell(LOCAL_COLS[name]).value = r[name].local;
      }
    }
    // Pengeluaran bisa ada di tanggal tanpa rekap.
    const expense = day.expense ?? 0;
    if (finance && (r || expense > 0)) {
      row.getCell(FINANCE_COLS.price).value = r?.pricePerKg ?? null;
      row.getCell(FINANCE_COLS.income).value = r?.income ?? null;
      row.getCell(FINANCE_COLS.expense).value = expense;
      row.getCell(FINANCE_COLS.profit).value = (r?.income ?? 0) - expense;
    }
  });

  const lastDataRow = FIRST_DATA_ROW + m.days.length - 1;
  const totalRow = ws.getRow(lastDataRow + 1);
  totalRow.getCell(1).value = "TOTAL";
  const sumOf = (col: string, result: number) => ({
    formula: `SUM(${col}${FIRST_DATA_ROW}:${col}${lastDataRow})`,
    result,
  });
  totalRow.getCell(2).value = sumOf("B", m.total.process.export);
  totalRow.getCell(3).value = sumOf("C", m.total.packing.export);
  totalRow.getCell(4).value = m.total.stock?.export ?? null;
  totalRow.getCell(6).value = sumOf("F", m.total.process.local);
  totalRow.getCell(7).value = sumOf("G", m.total.packing.local);
  totalRow.getCell(8).value = m.total.stock?.local ?? null;
  if (finance) {
    totalRow.getCell(FINANCE_COLS.income).value = sumOf("K", m.total.income ?? 0);
    totalRow.getCell(FINANCE_COLS.expense).value = sumOf("L", m.total.expense ?? 0);
    totalRow.getCell(FINANCE_COLS.profit).value = sumOf("M", m.total.profit ?? 0);
  }

  const lastCol = finance ? FINANCE_COLS.profit : 8;
  for (let r = FIRST_DATA_ROW; r <= lastDataRow + 1; r++) {
    const row = ws.getRow(r);
    for (let c = 2; c <= lastCol; c++) {
      if (c === 5 || c === 9) continue;
      const cell = row.getCell(c);
      cell.numFmt = c >= FINANCE_COLS.price ? RUPIAH_FORMAT : KG_FORMAT;
      cell.font = { name: "Arial", size: 10, bold: r === lastDataRow + 1 };
    }
  }
  for (let c = 1; c <= lastCol; c++) {
    if (c === 5 || c === 9) continue;
    const cell = totalRow.getCell(c);
    cell.fill = TOTAL_FILL;
    cell.font = { name: "Arial", size: 10, bold: true };
  }

  if (m.total.stockDate) {
    ws.getRow(lastDataRow + 2).getCell(1).value =
      `Sisa pada baris TOTAL = sisa tanggal ${Number(m.total.stockDate.slice(8, 10))}`;
    ws.getRow(lastDataRow + 2).getCell(1).font = { italic: true, name: "Arial", size: 9 };
  }

  if (expenses) addExpenseSheet(wb, m, expenses);
  return wb;
}

// Sheet kedua: daftar pengeluaran per tanggal, lalu total per kategori.
function addExpenseSheet(wb: ExcelJS.Workbook, m: MonthlyRecap, expenses: ExpenseRow[]) {
  const abbr = sheetNameFor(m.month).replace(/^REKAP /, "");
  const ws = wb.addWorksheet(`PENGELUARAN ${abbr}`, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [12, 24, 16, 40].map((width) => ({ width }));

  ["Tanggal", "Kategori", "Jumlah (Rp)", "Catatan"].forEach((text, i) => {
    ws.getRow(1).getCell(i + 1).value = text;
  });
  styleSubheader(ws, ["A1", "B1", "C1", "D1"]);

  expenses.forEach((e, i) => {
    const row = ws.getRow(2 + i);
    row.getCell(1).value = e.date;
    row.getCell(2).value = e.category;
    row.getCell(3).value = e.amount;
    row.getCell(4).value = e.note;
  });
  const totalRow = ws.getRow(2 + expenses.length);
  totalRow.getCell(1).value = "TOTAL";
  totalRow.getCell(3).value = {
    formula: `SUM(C2:C${Math.max(2, 1 + expenses.length)})`,
    result: m.total.expense ?? 0,
  };
  for (let c = 1; c <= 4; c++) {
    totalRow.getCell(c).fill = TOTAL_FILL;
    totalRow.getCell(c).font = { name: "Arial", size: 10, bold: true };
  }

  const catHeader = 4 + expenses.length;
  ["Kategori", "Jumlah (Rp)", "Banyaknya"].forEach((text, i) => {
    ws.getRow(catHeader).getCell(i + 2).value = text;
  });
  styleSubheader(ws, ["B", "C", "D"].map((c) => `${c}${catHeader}`));
  (m.expenseByCategory ?? []).forEach((c, i) => {
    const row = ws.getRow(catHeader + 1 + i);
    row.getCell(2).value = c.category;
    row.getCell(3).value = c.total;
    row.getCell(4).value = c.count;
  });

  ws.getColumn(3).numFmt = RUPIAH_FORMAT;
}

export const exportFileName = (month: string) => `Rekap-${month}.xlsx`;

// ---------- Template import ----------

// Sheet REKAP kosong (tanggal 1..akhir bulan) dengan format yang sama seperti export,
// tanpa kolom keuangan karena import hanya membaca kolom kg.
export function buildTemplateWorkbook(month: string): ExcelJS.Workbook {
  const zero = { total: 0, export: 0, local: 0 };
  return buildRecapWorkbook(
    {
      month,
      days: datesInMonth(month).map((date) => ({ date, recap: null })),
      total: { process: zero, packing: zero, stock: null, stockDate: null },
      missingDates: [],
    },
    null,
  );
}

export const templateFileName = (month: string) => `Template-Rekap-${month}.xlsx`;

