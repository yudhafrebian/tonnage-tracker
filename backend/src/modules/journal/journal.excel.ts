import ExcelJS from "exceljs";
import { Prisma } from "../../generated/prisma/client";
import { isDateString } from "../../lib/date";
import { MAX_KG } from "../../lib/validators";

// Format sheet harian staf (mis. "6 OKT 26"):
//   baris 2 = judul blok: "PROSES TGL ...", "SISA STOK TGL ...", "PACKING TGL ..." (berdampingan),
//   baris berikutnya = header "Supplier | Jenis Ikan | Size | ... ", lalu data sampai baris "TOTAL".
//   Proses: Supplier, Jenis, Size, QTY (KG). Sisa & Packing: Supplier, Jenis, Size, MC, KG.
// Data disalin apa adanya; tidak ada perhitungan atau penyeragaman nama.

export const IMPORT_SECTIONS = ["PROCESS", "PACKING", "STOCK"] as const;
export type ImportSection = (typeof IMPORT_SECTIONS)[number];

const MONTHS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MEI: 5, MAY: 5, JUN: 6, JUL: 7,
  AGU: 8, AGS: 8, AGT: 8, AUG: 8, SEP: 9, OKT: 10, OCT: 10, NOV: 11, DES: 12, DEC: 12,
};

// Kata pertama judul blok -> bagian jurnal.
const BLOCK_TITLES: Record<string, ImportSection> = { PROSES: "PROCESS", PACKING: "PACKING", SISA: "STOCK" };

export type ParsedEntry = {
  // Kunci stabil baris di file, dipakai pratinjau untuk menimpa label pasar per baris.
  key: string;
  date: string; // "2026-10-06"
  section: ImportSection;
  party: string;
  item: string;
  size: string | null;
  mc: number | null;
  kg: number;
  position: number; // urutan baris di blok, dimulai 0
};

export type JournalParseErrorCode =
  | "no_day_sheets"
  | "duplicate_date"
  | "block_missing"
  | "kg_missing"
  | "not_a_number"
  | "excel_error"
  | "negative_value"
  | "value_too_large";

type Params = Record<string, string | number>;
export type JournalParseError = { sheet: string; row: number; code: JournalParseErrorCode; params: Params; message: string };

const MESSAGES: Record<JournalParseErrorCode, (p: Params) => string> = {
  no_day_sheets: () => 'No daily sheet found (expected names like "6 OKT 26")',
  duplicate_date: (p) => `Date ${p.date} appears in more than one sheet`,
  block_missing: (p) => `Block "${p.block}" not found`,
  kg_missing: (p) => `${p.cell}: KG is empty`,
  not_a_number: (p) => `${p.cell}: "${p.value}" is not a number`,
  excel_error: (p) => `${p.cell}: Excel error ${p.error}`,
  negative_value: (p) => `${p.cell}: negative value ${p.value}`,
  value_too_large: (p) => `${p.cell}: value too large`,
};

const parseError = (sheet: string, row: number, code: JournalParseErrorCode, params: Params = {}): JournalParseError => ({
  sheet,
  row,
  code,
  params,
  message: MESSAGES[code](params),
});

// "6 OKT 26" / "6 OKT 2026" -> "2026-10-06"; nama lain (mis. "REKAP OKT") -> null.
export function dateOfSheetName(name: string): string | null {
  const m = name.trim().toUpperCase().match(/^(\d{1,2})\s+([A-Z]{3})[A-Z]*\s+(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2]!];
  if (!month) return null;
  const year = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const date = `${year}-${String(month).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return isDateString(date) ? date : null;
}

// Teks sel apa adanya (rich text digabung, hasil rumus diambil). Kosong -> null.
function readText(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("").trim() || null;
    if ("result" in v) return readText((v as { result?: ExcelJS.CellValue }).result);
    if ("text" in v) return String((v as { text: unknown }).text).trim() || null;
  }
  return null;
}

type CellNumber = { value: number | null } | { error: { code: "not_a_number" | "excel_error"; params: Params } };

// Angka biasa atau hasil rumus tersimpan. Rumus tanpa hasil tersimpan dianggap kosong.
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

type Block = { section: ImportSection; col: number };

// Cari kolom awal tiap blok dari judulnya ("PROSES TGL 6 OKT 26" -> PROCESS di kolom A).
function findBlocks(ws: ExcelJS.Worksheet): { blocks: Block[]; titleRow: number } | null {
  for (let r = 1; r <= Math.min(ws.rowCount, 6); r++) {
    const blocks: Block[] = [];
    ws.getRow(r).eachCell((cell, col) => {
      const first = readText(cell.value)?.toUpperCase().split(/\s+/)[0];
      const section = first ? BLOCK_TITLES[first] : undefined;
      if (section && !blocks.some((b) => b.section === section)) blocks.push({ section, col });
    });
    if (blocks.length > 0) return { blocks, titleRow: r };
  }
  return null;
}

// Baris header ("Supplier") pertama di bawah judul blok.
function findHeaderRow(ws: ExcelJS.Worksheet, col: number, from: number): number | null {
  for (let r = from + 1; r <= Math.min(ws.rowCount, from + 5); r++) {
    if (readText(ws.getRow(r).getCell(col).value)?.toUpperCase() === "SUPPLIER") return r;
  }
  return null;
}

export type JournalParseResult =
  | { ok: true; dates: { date: string; sheet: string }[]; entries: ParsedEntry[] }
  | { ok: false; errors: JournalParseError[] };

export function parseJournalWorkbook(wb: ExcelJS.Workbook): JournalParseResult {
  const errors: JournalParseError[] = [];
  const entries: ParsedEntry[] = [];
  const dates: { date: string; sheet: string }[] = [];
  const seen = new Map<string, string>();

  for (const ws of wb.worksheets) {
    const date = dateOfSheetName(ws.name);
    if (!date) continue; // sheet lain (mis. REKAP) diabaikan
    if (seen.has(date)) {
      errors.push(parseError(ws.name, 0, "duplicate_date", { date }));
      continue;
    }
    seen.set(date, ws.name);
    dates.push({ date, sheet: ws.name });

    const found = findBlocks(ws);
    for (const section of IMPORT_SECTIONS) {
      const block = found?.blocks.find((b) => b.section === section);
      const header = block && findHeaderRow(ws, block.col, found!.titleRow);
      if (!block || !header) {
        const name = { PROCESS: "PROSES", PACKING: "PACKING", STOCK: "SISA STOK" }[section];
        errors.push(parseError(ws.name, found?.titleRow ?? 0, "block_missing", { block: name }));
        continue;
      }

      // Proses tidak punya kolom MC: KG ada di kolom ke-4 blok. Sisa & Packing: MC ke-4, KG ke-5.
      const hasMc = section !== "PROCESS";
      const c = block.col;
      const mcCol = hasMc ? c + 3 : null;
      const kgCol = hasMc ? c + 4 : c + 3;

      let position = 0;
      for (let r = header + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        // Spasi ganda dirapikan supaya "TEK  BRD" dan "TEK BRD" tidak jadi dua supplier.
        const party = readText(row.getCell(c).value)?.replace(/\s+/g, " ") ?? null;
        if (party?.toUpperCase() === "TOTAL") break;
        const item = readText(row.getCell(c + 1).value);
        const size = readText(row.getCell(c + 2).value);
        const kgCell = row.getCell(kgCol);
        const mcCell = mcCol ? row.getCell(mcCol) : null;
        if (!party && !item && !size && kgCell.value == null && mcCell?.value == null) continue;

        const kg = readNumber(kgCell.value);
        const mc = mcCell ? readNumber(mcCell.value) : { value: null };
        let bad = false;
        for (const [cell, parsed] of [[kgCell, kg], [mcCell, mc]] as const) {
          if (!cell) continue;
          if ("error" in parsed) {
            errors.push(parseError(ws.name, r, parsed.error.code, { cell: cell.address, ...parsed.error.params }));
            bad = true;
          } else if (parsed.value !== null && parsed.value < 0) {
            errors.push(parseError(ws.name, r, "negative_value", { cell: cell.address, value: parsed.value }));
            bad = true;
          } else if (parsed.value !== null && parsed.value > MAX_KG) {
            errors.push(parseError(ws.name, r, "value_too_large", { cell: cell.address }));
            bad = true;
          }
        }
        if (bad) continue;
        if (!("value" in kg) || kg.value === null) {
          errors.push(parseError(ws.name, r, "kg_missing", { cell: kgCell.address }));
          continue;
        }

        entries.push({
          key: `${ws.name}!${section}!${r}`,
          date,
          section,
          party: party ?? "",
          item: item ?? "",
          size,
          mc: "value" in mc && mc.value !== null ? round2(mc.value) : null,
          // Hasil rumus Excel sering membawa galat float (3506.3999999), jadi dibulatkan ke 2 desimal.
          kg: round2(kg.value),
          position: position++,
        });
      }
    }
  }

  if (dates.length === 0) errors.push(parseError("", 0, "no_day_sheets"));
  if (errors.length > 0) return { ok: false, errors };
  dates.sort((a, b) => a.date.localeCompare(b.date));
  return { ok: true, dates, entries };
}
