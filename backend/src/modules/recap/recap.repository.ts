import { prisma } from "../../config/prisma";
import { Prisma } from "../../generated/prisma/client";

export const findByDate = (date: Date, tx: Prisma.TransactionClient = prisma) =>
  tx.dailyRecap.findUnique({ where: { date } });

export const findInRange = (range: { gte: Date; lt: Date }) =>
  prisma.dailyRecap.findMany({
    where: { date: range },
    orderBy: { date: "asc" },
  });

// Tanggal rekap paling awal; dipakai sebagai awal hitungan "belum diinput".
export const findFirstDate = async () =>
  (await prisma.dailyRecap.findFirst({ orderBy: { date: "asc" }, select: { date: true } }))?.date ?? null;

export const create = (
  tx: Prisma.TransactionClient,
  data: Prisma.DailyRecapCreateInput,
) => tx.dailyRecap.create({ data });

// Satu query untuk semua tanggal baru saat import; mengembalikan baris yang dibuat untuk audit log.
export const createMany = (
  tx: Prisma.TransactionClient,
  data: Prisma.DailyRecapCreateManyInput[],
) => tx.dailyRecap.createManyAndReturn({ data });

export const update = (
  tx: Prisma.TransactionClient,
  date: Date,
  data: Prisma.DailyRecapUpdateInput,
) => tx.dailyRecap.update({ where: { date }, data });

export const remove = (tx: Prisma.TransactionClient, date: Date) =>
  tx.dailyRecap.delete({ where: { date } });
