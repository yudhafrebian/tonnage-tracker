import { prisma } from "../../config/prisma";
import { Prisma } from "../../generated/prisma/client";

const withCreator = { createdBy: { select: { id: true, username: true, name: true } } } as const;

export const findInRange = (range: { gte: Date; lt: Date }, category?: string) =>
  prisma.expense.findMany({
    where: {
      date: range,
      category: category ? { equals: category, mode: "insensitive" } : undefined,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: withCreator,
  });

// Hanya kolom yang dibutuhkan untuk perhitungan pengeluaran dan laba di rekap/dashboard.
export const findAmountsInRange = (range: { gte: Date; lt: Date }) =>
  prisma.expense.findMany({
    where: { date: range },
    select: { date: true, category: true, amount: true },
  });

export const findById = (id: string, tx: Prisma.TransactionClient = prisma) =>
  tx.expense.findUnique({ where: { id }, include: withCreator });

// Ejaan kategori yang sudah tersimpan, tanpa membedakan huruf besar/kecil ("solar" -> "Solar").
export const findCategorySpelling = async (category: string, tx: Prisma.TransactionClient) =>
  (
    await tx.expense.findFirst({
      where: { category: { equals: category, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
      select: { category: true },
    })
  )?.category ?? null;

// Daftar kategori untuk autocomplete, yang paling sering dipakai lebih dulu.
export const listCategories = () =>
  prisma.expense.groupBy({
    by: ["category"],
    _count: { _all: true },
    _max: { date: true },
    orderBy: [{ _count: { category: "desc" } }, { category: "asc" }],
  });

export const create = (tx: Prisma.TransactionClient, data: Prisma.ExpenseUncheckedCreateInput) =>
  tx.expense.create({ data, include: withCreator });

export const update = (
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.ExpenseUncheckedUpdateInput,
) => tx.expense.update({ where: { id }, data, include: withCreator });

export const remove = (tx: Prisma.TransactionClient, id: string) =>
  tx.expense.delete({ where: { id } });
