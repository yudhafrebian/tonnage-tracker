import { prisma } from "../../config/prisma";
import { addDays, monthRange, parseDateString, toDateString, todayString } from "../../lib/date";
import { HttpError, notFoundError } from "../../lib/errors";
import * as audit from "../audit-log/audit-log.repository";
import type { AuditEntry } from "../audit-log/audit-log.repository";
import * as expenseRepo from "../expense/expense.repository";
import * as priceRateRepo from "../price-rate/price-rate.repository";
import {
  buildMonthlyRecap,
  buildYearlyRecap,
  columnsToSections,
  recapSnapshot,
  resolveSections,
  toRecapDto,
  type Finance,
} from "./recap.calc";
import {
  buildRecapWorkbook,
  buildTemplateWorkbook,
  exportFileName,
  parseRecapWorkbook,
  readWorkbook,
  sameValues,
  templateFileName,
  type ImportAction,
} from "./recap.excel";
import * as repo from "./recap.repository";
import type { CreateRecapInput, ImportOptions, InputMethod, UpdateRecapInput } from "./recap.schema";

const alreadyExists = () =>
  new HttpError(
    409,
    "conflict",
    { date: ["recap_already_exists"] },
    "Recap for this date already exists, edit it instead",
  );

// Tarif hanya dibutuhkan kalau field keuangan ikut dikirim.
const ratesUntil = (date: Date, includeFinance: boolean) =>
  includeFinance ? priceRateRepo.listEffectiveBefore(addDays(date, 1)) : Promise.resolve(null);

// Tarif dan pengeluaran untuk rentang tanggal; null untuk pengguna tanpa izin keuangan.
export const loadFinance = async (
  range: { gte: Date; lt: Date },
  includeFinance: boolean,
): Promise<Finance | null> => {
  if (!includeFinance) return null;
  const [rates, expenses] = await Promise.all([
    priceRateRepo.listEffectiveBefore(range.lt),
    expenseRepo.findAmountsInRange(range),
  ]);
  return { rates, expenses };
};

export const trackingWindow = async () => {
  const first = await repo.findFirstDate();
  return { start: first ? toDateString(first) : null, today: todayString() };
};

export const getMonthly = async (month: string, includeFinance: boolean) => {
  const range = monthRange(month);
  const [recaps, finance, window] = await Promise.all([
    repo.findInRange(range),
    loadFinance(range, includeFinance),
    trackingWindow(),
  ]);
  return buildMonthlyRecap(month, recaps, finance, window);
};

export const getYearly = async (year: number, includeFinance: boolean) => {
  const range = { gte: parseDateString(`${year}-01-01`), lt: parseDateString(`${year + 1}-01-01`) };
  const [recaps, finance, window] = await Promise.all([
    repo.findInRange(range),
    loadFinance(range, includeFinance),
    trackingWindow(),
  ]);
  return buildYearlyRecap(year, recaps, finance, window);
};

export const getByDate = async (dateStr: string, includeFinance: boolean) => {
  const date = parseDateString(dateStr);
  const recap = await repo.findByDate(date);
  if (!recap) throw notFoundError();
  return toRecapDto(recap, await ratesUntil(date, includeFinance));
};

export const create = async (
  userId: string,
  method: InputMethod,
  input: CreateRecapInput,
  includeFinance: boolean,
) => {
  const date = parseDateString(input.date);
  const columns = resolveSections(method, input);
  const created = await prisma.$transaction(async (tx) => {
    if (await repo.findByDate(date, tx)) throw alreadyExists();
    const recap = await repo.create(tx, { date, ...columns, note: input.note || null });
    await audit.record(tx, {
      userId,
      action: "create",
      entity: "DailyRecap",
      entityId: recap.id,
      after: { ...recapSnapshot(recap), method },
    });
    return recap;
  });
  return toRecapDto(created, await ratesUntil(date, includeFinance));
};

export const update = async (
  userId: string,
  dateStr: string,
  method: InputMethod,
  input: UpdateRecapInput,
  includeFinance: boolean,
) => {
  const date = parseDateString(dateStr);
  const columns = resolveSections(method, input);
  const updated = await prisma.$transaction(async (tx) => {
    const before = await repo.findByDate(date, tx);
    if (!before) throw notFoundError();
    const recap = await repo.update(tx, date, {
      ...columns,
      // undefined = tidak diubah, null atau "" = catatan dihapus.
      note: input.note === undefined ? undefined : input.note || null,
    });
    await audit.record(tx, {
      userId,
      action: "update",
      entity: "DailyRecap",
      entityId: recap.id,
      before: recapSnapshot(before),
      after: { ...recapSnapshot(recap), method },
    });
    return recap;
  });
  return toRecapDto(updated, await ratesUntil(date, includeFinance));
};

export const remove = (userId: string, dateStr: string) =>
  prisma.$transaction(async (tx) => {
    const date = parseDateString(dateStr);
    const before = await repo.findByDate(date, tx);
    if (!before) throw notFoundError();
    await repo.remove(tx, date);
    await audit.record(tx, {
      userId,
      action: "delete",
      entity: "DailyRecap",
      entityId: before.id,
      before: recapSnapshot(before),
    });
  });

export const exportMonth = async (month: string, includeFinance: boolean) => {
  const [monthly, expenses] = await Promise.all([
    getMonthly(month, includeFinance),
    includeFinance ? expenseRepo.findInRange(monthRange(month)) : Promise.resolve(null),
  ]);
  const wb = buildRecapWorkbook(
    monthly,
    expenses?.map((e) => ({
      date: toDateString(e.date),
      category: e.category,
      amount: e.amount,
      note: e.note,
    })) ?? null,
  );
  return { fileName: exportFileName(month), buffer: await wb.xlsx.writeBuffer() };
};

export const importTemplate = async (month: string) => ({
  fileName: templateFileName(month),
  buffer: await buildTemplateWorkbook(month).xlsx.writeBuffer(),
});

// Import sheet REKAP bulanan. Kolom Ekspor dan Lokal masuk lewat method export_local.
// Semua tanggal disimpan dalam satu transaksi: kalau satu gagal, tidak ada yang tersimpan.
export const importMonth = async (
  userId: string,
  month: string,
  file: Buffer,
  options: ImportOptions,
) => {
  const wb = await readWorkbook(file).catch(() => {
    throw new HttpError(400, "invalid_file", { file: ["invalid_xlsx"] }, "Not a valid .xlsx file");
  });
  const parsed = parseRecapWorkbook(wb, month);
  if (!parsed.ok) {
    throw new HttpError(
      400,
      "import_invalid",
      { rows: parsed.errors },
      "File contains invalid data, nothing was imported",
    );
  }

  const existing = new Map(
    (await repo.findInRange(monthRange(month))).map((r) => [toDateString(r.date), r]),
  );
  const plan = parsed.rows.map((row) => {
    const columns = resolveSections("export_local", row);
    const current = existing.get(row.date);
    const action: ImportAction = !current
      ? "create"
      : sameValues(current, columns)
        ? "unchanged"
        : options.onConflict === "overwrite"
          ? "update"
          : "skip";
    return { date: row.date, columns, current, action };
  });

  if (!options.dryRun) {
    await prisma.$transaction(
      async (tx) => {
        const creates = plan.filter((p) => p.action === "create");
        const created = creates.length
          ? await repo.createMany(
              tx,
              creates.map((p) => ({ date: parseDateString(p.date), ...p.columns })),
            )
          : [];
        const logs: AuditEntry[] = created.map((r) => ({
          userId,
          action: "import",
          entity: "DailyRecap",
          entityId: r.id,
          after: { ...recapSnapshot(r), sheet: parsed.sheetName },
        }));
        for (const p of plan) {
          if (p.action !== "update" || !p.current) continue;
          const updated = await repo.update(tx, p.current.date, p.columns);
          logs.push({
            userId,
            action: "import",
            entity: "DailyRecap",
            entityId: updated.id,
            before: recapSnapshot(p.current),
            after: { ...recapSnapshot(updated), sheet: parsed.sheetName },
          });
        }
        if (logs.length) await audit.recordMany(tx, logs);
      },
      // Database remote: puluhan query dalam satu transaksi bisa melewati batas bawaan 5 detik.
      { timeout: 30_000 },
    );
  }

  const summary: Record<ImportAction, number> = { create: 0, update: 0, skip: 0, unchanged: 0 };
  for (const p of plan) summary[p.action]++;
  return {
    month,
    sheet: parsed.sheetName,
    dryRun: options.dryRun,
    onConflict: options.onConflict,
    summary,
    rows: plan.map((p) => ({ date: p.date, action: p.action, ...columnsToSections(p.columns) })),
  };
};
