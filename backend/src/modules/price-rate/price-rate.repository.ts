import { prisma } from "../../config/prisma";
import { Prisma } from "../../generated/prisma/client";

export const listAll = () =>
  prisma.priceRate.findMany({ orderBy: { effectiveFrom: "desc" } });

// Semua tarif yang mungkin berlaku sebelum batas `lt`, urut naik.
// Jumlah tarif sedikit (berubah jarang), jadi aman diambil semua.
export const listEffectiveBefore = (lt: Date) =>
  prisma.priceRate.findMany({
    where: { effectiveFrom: { lt } },
    orderBy: { effectiveFrom: "asc" },
  });

export const findById = (tx: Prisma.TransactionClient, id: string) =>
  tx.priceRate.findUnique({ where: { id } });

export const create = (
  tx: Prisma.TransactionClient,
  data: Prisma.PriceRateCreateInput,
) => tx.priceRate.create({ data });

export const update = (
  tx: Prisma.TransactionClient,
  id: string,
  data: Prisma.PriceRateUpdateInput,
) => tx.priceRate.update({ where: { id }, data });

export const remove = (tx: Prisma.TransactionClient, id: string) =>
  tx.priceRate.delete({ where: { id } });
