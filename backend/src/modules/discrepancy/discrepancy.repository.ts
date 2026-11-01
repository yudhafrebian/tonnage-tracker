import { prisma } from "../../config/prisma";
import { Prisma, type DiscrepancyStatus } from "../../generated/prisma/client";

const withCreator = { createdBy: { select: { id: true, username: true, name: true } } } as const;

export const list = (filter: { status?: DiscrepancyStatus; range?: { gte: Date; lt: Date } }) =>
  prisma.stockDiscrepancy.findMany({
    where: { status: filter.status, date: filter.range },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: withCreator,
  });

export const countOpen = () => prisma.stockDiscrepancy.count({ where: { status: "OPEN" } });

export const findById = (id: string, tx: Prisma.TransactionClient = prisma) =>
  tx.stockDiscrepancy.findUnique({ where: { id }, include: withCreator });

export const create = (tx: Prisma.TransactionClient, data: Prisma.StockDiscrepancyUncheckedCreateInput) =>
  tx.stockDiscrepancy.create({ data, include: withCreator });

export const update = (tx: Prisma.TransactionClient, id: string, data: Prisma.StockDiscrepancyUpdateInput) =>
  tx.stockDiscrepancy.update({ where: { id }, data, include: withCreator });

export const remove = (tx: Prisma.TransactionClient, id: string) => tx.stockDiscrepancy.delete({ where: { id } });
