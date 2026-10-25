import { prisma } from "../../config/prisma";
import { Prisma } from "../../generated/prisma/client";

export type AuditAction = "create" | "update" | "delete" | "import";
export type AuditEntity = "DailyRecap" | "PriceRate" | "Expense";

export type AuditEntry = {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
};

// Dipanggil di dalam transaksi yang sama dengan perubahan datanya,
// supaya tidak ada perubahan yang tersimpan tanpa jejak.
export const record = (tx: Prisma.TransactionClient, entry: AuditEntry) =>
  tx.auditLog.create({ data: entry });

export const recordMany = (tx: Prisma.TransactionClient, entries: AuditEntry[]) =>
  tx.auditLog.createMany({ data: entries });

export type AuditLogFilter = {
  from?: Date;
  to?: Date; // eksklusif
  userId?: string;
  entity?: AuditEntity;
  entityId?: string;
  action?: AuditAction;
  page: number;
  limit: number;
};

export const list = async (f: AuditLogFilter) => {
  const where: Prisma.AuditLogWhereInput = {
    createdAt: { gte: f.from, lt: f.to },
    userId: f.userId,
    entity: f.entity,
    entityId: f.entityId,
    action: f.action,
  };
  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.limit,
      take: f.limit,
      include: { user: { select: { id: true, username: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total };
};
