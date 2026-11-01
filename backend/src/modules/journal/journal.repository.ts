import { prisma } from "../../config/prisma";
import { Prisma, type JournalSection } from "../../generated/prisma/client";

export const findByDate = (date: Date) =>
  prisma.journalEntry.findMany({
    where: { date },
    orderBy: [{ section: "asc" }, { position: "asc" }],
  });

// Jumlah baris & total kg per tanggal per bagian dalam satu bulan (untuk strip tanggal).
export const summarizeRange = (range: { gte: Date; lt: Date }) =>
  prisma.journalEntry.groupBy({
    by: ["date", "section"],
    where: { date: range },
    _count: { _all: true },
    _sum: { kg: true },
    orderBy: { date: "asc" },
  });

export const findLatestDate = async () =>
  (await prisma.journalEntry.findFirst({ orderBy: { date: "desc" }, select: { date: true } }))?.date ?? null;

// Tanggal (dari daftar) yang sudah punya baris di bagian tertentu: dipakai pratinjau "akan diganti".
export const countByDates = (dates: Date[], sections: JournalSection[]) =>
  prisma.journalEntry.groupBy({
    by: ["date"],
    where: { date: { in: dates }, section: { in: sections } },
    _count: { _all: true },
  });

export const findById = (id: string, tx: Prisma.TransactionClient = prisma) =>
  tx.journalEntry.findUnique({ where: { id } });

// Posisi berikutnya di bagian itu: baris manual ditambahkan di akhir daftar.
export const nextPosition = async (tx: Prisma.TransactionClient, date: Date, section: JournalSection) =>
  ((await tx.journalEntry.aggregate({ where: { date, section }, _max: { position: true } }))._max.position ?? -1) + 1;

export const createRows = (tx: Prisma.TransactionClient, data: Prisma.JournalEntryCreateManyInput[]) =>
  tx.journalEntry.createManyAndReturn({ data });

export const update = (tx: Prisma.TransactionClient, id: string, data: Prisma.JournalEntryUpdateInput) =>
  tx.journalEntry.update({ where: { id }, data });

export const remove = (tx: Prisma.TransactionClient, id: string) => tx.journalEntry.delete({ where: { id } });

export const countSection = (tx: Prisma.TransactionClient, date: Date, section: JournalSection) =>
  tx.journalEntry.count({ where: { date, section } });

// Tanggal terakhir sebelum `date` yang punya baris di bagian itu (untuk "salin sisa stok").
export const findPreviousDate = async (tx: Prisma.TransactionClient, date: Date, section: JournalSection) =>
  (
    await tx.journalEntry.findFirst({
      where: { section, date: { lt: date } },
      orderBy: { date: "desc" },
      select: { date: true },
    })
  )?.date ?? null;

export const findSection = (tx: Prisma.TransactionClient, date: Date, section: JournalSection) =>
  tx.journalEntry.findMany({ where: { date, section }, orderBy: { position: "asc" } });

export const findSupplierMarkets = (names: string[]) =>
  prisma.supplierMarket.findMany({ where: { name: { in: names } } });

export const replaceDays = async (
  tx: Prisma.TransactionClient,
  dates: Date[],
  sections: JournalSection[],
  rows: Prisma.JournalEntryCreateManyInput[],
) => {
  const removed = await tx.journalEntry.deleteMany({ where: { date: { in: dates }, section: { in: sections } } });
  const created = await tx.journalEntry.createMany({ data: rows });
  return { removed: removed.count, created: created.count };
};

// Berurutan, bukan Promise.all: satu transaksi = satu koneksi, query tetap jalan satu per satu.
export const saveSupplierMarkets = async (
  tx: Prisma.TransactionClient,
  markets: Record<string, "EXPORT" | "LOCAL">,
) => {
  for (const [name, market] of Object.entries(markets)) {
    await tx.supplierMarket.upsert({ where: { name }, create: { name, market }, update: { market } });
  }
};
