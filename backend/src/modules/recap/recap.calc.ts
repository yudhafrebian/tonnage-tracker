import { Prisma } from "../../generated/prisma/client";
import type { DailyRecap, Expense, PriceRate } from "../../generated/prisma/client";
import { datesInMonth, toDateString } from "../../lib/date";
import { HttpError } from "../../lib/errors";
import { MAX_KG } from "../../lib/validators";
import { sumExpenses, totalsByCategory, type CategoryTotal } from "../expense/expense.calc";
import { priceAt } from "../price-rate/price-rate.calc";
import { SECTIONS, type InputMethod, type SectionInput, type SectionName } from "./recap.schema";

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export type SectionValues = { total: Decimal; export: Decimal; local: Decimal };
export type SectionNumbers = { total: number; export: number; local: number };

// Kolom database untuk tiap section, misalnya process -> processTotal/processExport/processLocal.
type SectionColumns = {
  [S in SectionName as `${S}${"Total" | "Export" | "Local"}`]: Decimal;
};

// Menghitung angka ketiga dari dua angka yang diketik admin.
// Mengembalikan pesan error per field (key "process.export" dst.) kalau hasilnya tidak masuk akal.
export function resolveSection(
  name: SectionName,
  method: InputMethod,
  input: SectionInput,
): { values: SectionValues } | { errors: Record<string, string[]> } {
  const d = (v: number | undefined) => new Decimal(v ?? 0);
  switch (method) {
    case "total_export": {
      const total = d(input.total);
      const exp = d(input.export);
      if (exp.gt(total)) return { errors: { [`${name}.export`]: ["exceeds_total"] } };
      return { values: { total, export: exp, local: total.minus(exp) } };
    }
    case "total_local": {
      const total = d(input.total);
      const local = d(input.local);
      if (local.gt(total)) return { errors: { [`${name}.local`]: ["exceeds_total"] } };
      return { values: { total, export: total.minus(local), local } };
    }
    case "export_local": {
      const exp = d(input.export);
      const local = d(input.local);
      const total = exp.plus(local);
      if (total.gt(MAX_KG)) return { errors: { [`${name}.total`]: ["exceeds_max"] } };
      return { values: { total, export: exp, local } };
    }
  }
}

// Menghitung semua section yang dikirim sekaligus, lalu mengumpulkan semua error dalam satu respons.
export function resolveSections(
  method: InputMethod,
  input: Partial<Record<SectionName, SectionInput>>,
): Partial<SectionColumns> {
  const columns: Partial<SectionColumns> = {};
  const errors: Record<string, string[]> = {};
  for (const name of SECTIONS) {
    const section = input[name];
    if (!section) continue;
    const result = resolveSection(name, method, section);
    if ("errors" in result) {
      Object.assign(errors, result.errors);
      continue;
    }
    columns[`${name}Total`] = result.values.total;
    columns[`${name}Export`] = result.values.export;
    columns[`${name}Local`] = result.values.local;
  }
  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, "validation_failed", errors, "Invalid Data");
  }
  return columns;
}

const sectionOf = (r: SectionColumns, name: SectionName): SectionNumbers => ({
  total: r[`${name}Total`].toNumber(),
  export: r[`${name}Export`].toNumber(),
  local: r[`${name}Local`].toNumber(),
});

// Kolom lengkap hasil resolveSections (ketiga section terisi) -> bentuk { process, packing, stock }.
export const columnsToSections = (columns: Partial<SectionColumns>) => {
  const full = columns as SectionColumns;
  return {
    process: sectionOf(full, "process"),
    packing: sectionOf(full, "packing"),
    stock: sectionOf(full, "stock"),
  };
};

// Pemasukan = kg proses total x harga per kg, dibulatkan ke rupiah.
export const incomeOf = (processTotal: Decimal, pricePerKg: number | null): number | null =>
  pricePerKg === null
    ? null
    : processTotal.mul(pricePerKg).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

export type RecapDto = {
  id: string;
  date: string;
  process: SectionNumbers;
  packing: SectionNumbers;
  stock: SectionNumbers;
  note: string | null;
  pricePerKg?: number | null;
  income?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// Data keuangan untuk perhitungan pemasukan, pengeluaran, dan laba.
// null = pengguna tanpa izin keuangan (VIEWER): semua field keuangan tidak dikirim sama sekali.
export type Finance = {
  rates: PriceRate[]; // urut naik berdasarkan effectiveFrom
  expenses: Pick<Expense, "date" | "category" | "amount">[];
};

// `rates` urut naik. null = tanpa field keuangan.
export function toRecapDto(r: DailyRecap, rates: PriceRate[] | null): RecapDto {
  const dto: RecapDto = {
    id: r.id,
    date: toDateString(r.date),
    process: sectionOf(r, "process"),
    packing: sectionOf(r, "packing"),
    stock: sectionOf(r, "stock"),
    note: r.note,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
  if (rates) {
    const price = priceAt(rates, r.date);
    dto.pricePerKg = price;
    dto.income = incomeOf(r.processTotal, price);
  }
  return dto;
}

// Snapshot untuk audit log: angka bisnis saja, dalam bentuk number agar mudah dibaca.
export const recapSnapshot = (r: DailyRecap) => ({
  date: toDateString(r.date),
  process: sectionOf(r, "process"),
  packing: sectionOf(r, "packing"),
  stock: sectionOf(r, "stock"),
  note: r.note,
});

export type MonthlyRecap = {
  month: string;
  // expense: total pengeluaran di tanggal itu (ada juga di tanggal tanpa rekap).
  days: { date: string; recap: RecapDto | null; expense?: number }[];
  total: {
    process: SectionNumbers;
    packing: SectionNumbers;
    // Sisa tidak dijumlah: yang dipakai sisa di tanggal terakhir yang sudah diinput.
    stock: SectionNumbers | null;
    stockDate: string | null;
    income?: number;
    expense?: number;
    profit?: number; // pemasukan - pengeluaran
  };
  // Tanggal tanpa rekap, dihitung dari rekap pertama di database sampai hari ini.
  missingDates: string[];
  // Tanggal yang punya rekap tapi belum ada tarif yang berlaku, jadi pemasukannya kosong.
  unpricedDates?: string[];
  expenseByCategory?: CategoryTotal[];
};

// Rentang tanggal yang wajib punya rekap. start = tanggal rekap pertama di database
// (null kalau belum ada rekap sama sekali), supaya hari sebelum sistem dipakai tidak dianggap terlewat.
export type TrackingWindow = { start: string | null; today: string };

export function buildMonthlyRecap(
  month: string,
  recaps: DailyRecap[],
  finance: Finance | null,
  window: TrackingWindow,
): MonthlyRecap {
  const { start, today } = window;
  const expenses = finance?.expenses.filter((e) => toDateString(e.date).startsWith(month)) ?? [];
  const byDate = new Map(recaps.map((r) => [toDateString(r.date), r]));
  const sum = (name: "process" | "packing", field: "Total" | "Export" | "Local") =>
    recaps.reduce((acc, r) => acc.plus(r[`${name}${field}`]), new Decimal(0)).toNumber();
  const sumSection = (name: "process" | "packing"): SectionNumbers => ({
    total: sum(name, "Total"),
    export: sum(name, "Export"),
    local: sum(name, "Local"),
  });

  const dates = datesInMonth(month);
  const days = dates.map((date) => {
    const r = byDate.get(date);
    const day: MonthlyRecap["days"][number] = { date, recap: r ? toRecapDto(r, finance?.rates ?? null) : null };
    if (finance) day.expense = sumExpenses(expenses.filter((e) => toDateString(e.date) === date));
    return day;
  });

  const lastRecorded = [...days].reverse().find((d) => d.recap !== null)?.recap ?? null;

  const result: MonthlyRecap = {
    month,
    days,
    total: {
      process: sumSection("process"),
      packing: sumSection("packing"),
      stock: lastRecorded?.stock ?? null,
      stockDate: lastRecorded?.date ?? null,
    },
    // String "YYYY-MM-DD" bisa dibandingkan langsung secara leksikografis.
    missingDates:
      start === null
        ? []
        : dates.filter((date) => date >= start && date <= today && !byDate.has(date)),
  };

  if (finance) {
    const income = days.reduce((acc, d) => acc + (d.recap?.income ?? 0), 0);
    const expense = sumExpenses(expenses);
    Object.assign(result.total, { income, expense, profit: income - expense });
    result.unpricedDates = days
      .filter((d) => d.recap !== null && d.recap.income === null)
      .map((d) => d.date);
    result.expenseByCategory = totalsByCategory(expenses);
  }
  return result;
}

export type MonthSummary = MonthlyRecap["total"] & {
  month: string;
  recordedDays: number;
  missingDays: number;
};

// Satu baris ringkasan per bulan (aturan sama dengan baris TOTAL bulanan).
// `recaps` dan pengeluaran boleh berisi tanggal di luar bulan itu; yang dipakai hanya tanggal di bulan tersebut.
export function summarizeMonth(
  month: string,
  recaps: DailyRecap[],
  finance: Finance | null,
  window: TrackingWindow,
): MonthSummary {
  const m = buildMonthlyRecap(
    month,
    recaps.filter((r) => toDateString(r.date).startsWith(month)),
    finance,
    window,
  );
  return {
    month,
    recordedDays: m.days.filter((d) => d.recap !== null).length,
    missingDays: m.missingDates.length,
    ...m.total,
  };
}

export type YearlyRecap = {
  year: number;
  months: MonthSummary[];
  total: MonthlyRecap["total"] & { recordedDays: number; missingDays: number };
};

// 12 baris per bulan dengan aturan yang sama seperti baris TOTAL bulanan,
// lalu satu baris total tahun: proses, packing, pemasukan, dan pengeluaran dijumlah, sisa = sisa terakhir di tahun itu.
export function buildYearlyRecap(
  year: number,
  recaps: DailyRecap[],
  finance: Finance | null,
  window: TrackingWindow,
): YearlyRecap {
  const months = Array.from({ length: 12 }, (_, i) =>
    summarizeMonth(`${year}-${String(i + 1).padStart(2, "0")}`, recaps, finance, window),
  );

  // Dijumlah dengan Decimal agar total tahun tidak membawa galat float.
  const sum = (pick: (m: MonthSummary) => number) =>
    months.reduce((acc, m) => acc.plus(pick(m)), new Decimal(0)).toNumber();
  const sumSection = (name: "process" | "packing"): SectionNumbers => ({
    total: sum((m) => m[name].total),
    export: sum((m) => m[name].export),
    local: sum((m) => m[name].local),
  });
  const lastWithStock = [...months].reverse().find((m) => m.stock !== null);

  const total: YearlyRecap["total"] = {
    recordedDays: months.reduce((a, m) => a + m.recordedDays, 0),
    missingDays: months.reduce((a, m) => a + m.missingDays, 0),
    process: sumSection("process"),
    packing: sumSection("packing"),
    stock: lastWithStock?.stock ?? null,
    stockDate: lastWithStock?.stockDate ?? null,
  };
  if (finance) {
    const sumMoney = (pick: (m: MonthSummary) => number | undefined) =>
      months.reduce((a, m) => a + (pick(m) ?? 0), 0);
    total.income = sumMoney((m) => m.income);
    total.expense = sumMoney((m) => m.expense);
    total.profit = total.income - total.expense;
  }

  return { year, months, total };
}
