import { prisma } from "../../config/prisma";
import type { JournalEntry } from "../../generated/prisma/client";
import { monthRange, parseDateString, toDateString } from "../../lib/date";
import { HttpError, notFoundError } from "../../lib/errors";
import * as audit from "../audit-log/audit-log.repository";
import { IMPORT_SECTIONS, parseJournalWorkbook, type ImportSection } from "./journal.excel";
import { readWorkbook } from "../recap/recap.excel";
import * as repo from "./journal.repository";
import type { CreateEntriesInput, ImportMarkets, MarketValue, UpdateEntryInput } from "./journal.schema";

// Snapshot satu baris untuk audit log.
const snapshot = (e: JournalEntry) => ({
  date: toDateString(e.date),
  section: e.section,
  party: e.party,
  item: e.item,
  size: e.size,
  mc: e.mc === null ? null : e.mc.toNumber(),
  kg: e.kg.toNumber(),
  market: e.market,
});

// Tambah beberapa baris sekaligus untuk satu pemilik/pelanggan (form manual & barang keluar).
// Disalin apa adanya; Proses tidak punya MC (sama dengan laporan staf).
export const createEntries = (userId: string, input: CreateEntriesInput) =>
  prisma.$transaction(async (tx) => {
    const date = parseDateString(input.date);
    const start = await repo.nextPosition(tx, date, input.section);
    const created = await repo.createRows(
      tx,
      input.rows.map((r, i) => ({
        date,
        section: input.section,
        party: input.party,
        market: input.market,
        item: r.item,
        size: r.size ?? null,
        mc: input.section === "PROCESS" ? null : (r.mc ?? null),
        kg: r.kg,
        position: start + i,
      })),
    );
    created.sort((a, b) => a.position - b.position);
    await audit.record(tx, {
      userId,
      action: "create",
      entity: "JournalEntry",
      after: {
        date: input.date,
        section: input.section,
        party: input.party,
        market: input.market,
        rows: created.length,
        kg: created.reduce((acc, e) => acc + e.kg.toNumber(), 0),
      },
    });
    return created.map(toDto);
  });

export const updateEntry = (userId: string, id: string, input: UpdateEntryInput) =>
  prisma.$transaction(async (tx) => {
    const before = await repo.findById(id, tx);
    if (!before) throw notFoundError();
    const updated = await repo.update(tx, id, {
      ...input,
      mc: before.section === "PROCESS" ? null : input.mc,
    });
    await audit.record(tx, {
      userId,
      action: "update",
      entity: "JournalEntry",
      entityId: id,
      before: snapshot(before),
      after: snapshot(updated),
    });
    return toDto(updated);
  });

export const removeEntry = (userId: string, id: string) =>
  prisma.$transaction(async (tx) => {
    const before = await repo.findById(id, tx);
    if (!before) throw notFoundError();
    await repo.remove(tx, id);
    await audit.record(tx, { userId, action: "delete", entity: "JournalEntry", entityId: id, before: snapshot(before) });
  });

// Salin seluruh sisa stok dari tanggal terakhir sebelumnya, lalu tinggal diubah yang berbeda.
// Hanya untuk tanggal yang belum punya sisa stok, supaya tidak tercampur/dobel.
export const copyStock = (userId: string, dateStr: string) =>
  prisma.$transaction(async (tx) => {
    const date = parseDateString(dateStr);
    if ((await repo.countSection(tx, date, "STOCK")) > 0) {
      throw new HttpError(409, "stock_exists", undefined, "This date already has stock rows");
    }
    const from = await repo.findPreviousDate(tx, date, "STOCK");
    if (!from) throw new HttpError(404, "no_previous_stock", undefined, "No earlier stock to copy");
    const source = await repo.findSection(tx, from, "STOCK");
    const created = await repo.createRows(
      tx,
      source.map((e) => ({
        date,
        section: "STOCK",
        party: e.party,
        item: e.item,
        size: e.size,
        mc: e.mc,
        kg: e.kg,
        market: e.market,
        position: e.position,
      })),
    );
    await audit.record(tx, {
      userId,
      action: "create",
      entity: "JournalEntry",
      after: { date: dateStr, section: "STOCK", copiedFrom: toDateString(from), rows: created.length },
    });
    return { from: toDateString(from), rows: created.length };
  });

const toDto = (e: JournalEntry) => ({
  id: e.id,
  section: e.section,
  party: e.party,
  item: e.item,
  size: e.size,
  mc: e.mc === null ? null : e.mc.toNumber(),
  kg: e.kg.toNumber(),
  market: e.market,
});

export const getDay = async (date: string) => ({
  date,
  entries: (await repo.findByDate(parseDateString(date))).map(toDto),
});

// Ringkasan per tanggal dalam sebulan: jumlah baris & kg per bagian. Dipakai strip tanggal di UI.
export const getMonth = async (month: string) => {
  const groups = await repo.summarizeRange(monthRange(month));
  const days = new Map<string, Record<string, { rows: number; kg: number }>>();
  for (const g of groups) {
    const date = toDateString(g.date);
    const day = days.get(date) ?? {};
    day[g.section] = { rows: g._count._all, kg: g._sum.kg?.toNumber() ?? 0 };
    days.set(date, day);
  }
  return {
    month,
    days: [...days].map(([date, sections]) => ({ date, sections })),
  };
};

export const getLatestDate = async () => {
  const date = await repo.findLatestDate();
  return { date: date ? toDateString(date) : null };
};

const invalidFile = () =>
  new HttpError(400, "invalid_file", { file: ["invalid_xlsx"] }, "Not a valid .xlsx file");

// Import sheet harian (format "6 OKT 26"). Tanggal yang ada di file menggantikan data Proses,
// Packing, dan Sisa Stok tanggal itu (barang keluar tidak disentuh). Pratinjau (dryRun) mengembalikan
// semua baris + label pasar yang sudah dikenal; simpan wajib menyertakan label untuk semua supplier.
export const importFile = async (
  userId: string,
  file: Buffer,
  options: { dryRun: boolean; markets: ImportMarkets | null },
) => {
  const wb = await readWorkbook(file).catch(() => {
    throw invalidFile();
  });
  const parsed = parseJournalWorkbook(wb);
  if (!parsed.ok) {
    throw new HttpError(400, "import_invalid", { rows: parsed.errors }, "File contains invalid data, nothing was imported");
  }

  const dates = parsed.dates.map((d) => parseDateString(d.date));
  const sections = [...IMPORT_SECTIONS];
  const supplierRows = new Map<string, number>();
  for (const e of parsed.entries) supplierRows.set(e.party, (supplierRows.get(e.party) ?? 0) + 1);
  const supplierNames = [...supplierRows.keys()].sort((a, b) => a.localeCompare(b));

  const [known, existing] = await Promise.all([
    repo.findSupplierMarkets(supplierNames),
    repo.countByDates(dates, sections),
  ]);
  const knownMarket = new Map(known.map((k) => [k.name, k.market as MarketValue]));
  const replaced = new Set(existing.map((e) => toDateString(e.date)));

  const sectionTotals = (date: string) =>
    Object.fromEntries(
      IMPORT_SECTIONS.map((s) => {
        const rows = parsed.entries.filter((e) => e.date === date && e.section === s);
        const kg = rows.reduce((acc, e) => acc + e.kg, 0);
        return [s, { rows: rows.length, kg: Math.round(kg * 100) / 100 }];
      }),
    ) as Record<ImportSection, { rows: number; kg: number }>;

  const summary = {
    dryRun: options.dryRun,
    dates: parsed.dates.map((d) => ({ ...d, replaces: replaced.has(d.date), sections: sectionTotals(d.date) })),
    suppliers: supplierNames.map((name) => ({
      name,
      rows: supplierRows.get(name)!,
      market: knownMarket.get(name) ?? null,
    })),
  };

  if (options.dryRun) return { ...summary, entries: parsed.entries };

  const markets = options.markets;
  const missing = supplierNames.filter((n) => !markets?.suppliers[n]);
  if (!markets || missing.length > 0) {
    throw new HttpError(400, "validation_failed", { suppliers: missing }, "Every supplier needs a market");
  }

  const rows = parsed.entries.map((e) => ({
    date: parseDateString(e.date),
    section: e.section,
    party: e.party,
    item: e.item,
    size: e.size,
    mc: e.mc,
    kg: e.kg,
    market: markets.rows[e.key] ?? markets.suppliers[e.party]!,
    position: e.position,
  }));
  const supplierMarkets = Object.fromEntries(supplierNames.map((n) => [n, markets.suppliers[n]!]));

  const result = await prisma.$transaction(
    async (tx) => {
      const counts = await repo.replaceDays(tx, dates, sections, rows);
      await repo.saveSupplierMarkets(tx, supplierMarkets);
      // Satu catatan per import (bukan per baris: ribuan baris akan membanjiri audit log).
      await audit.record(tx, {
        userId,
        action: "import",
        entity: "Journal",
        after: {
          from: parsed.dates[0]!.date,
          to: parsed.dates[parsed.dates.length - 1]!.date,
          days: parsed.dates.length,
          rows: counts.created,
          replacedRows: counts.removed,
          sheets: parsed.dates.map((d) => d.sheet).join(", "),
        },
      });
      return counts;
    },
    // Database remote: ribuan baris dalam satu transaksi bisa melewati batas bawaan 5 detik.
    { timeout: 60_000 },
  );

  return { ...summary, saved: result };
};
