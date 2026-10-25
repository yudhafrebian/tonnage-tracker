import { prisma } from "../../config/prisma";
import type { Expense } from "../../generated/prisma/client";
import { monthRange, parseDateString, toDateString } from "../../lib/date";
import { notFoundError } from "../../lib/errors";
import * as audit from "../audit-log/audit-log.repository";
import { sumExpenses, totalsByCategory } from "./expense.calc";
import * as repo from "./expense.repository";
import type { CreateExpenseInput, UpdateExpenseInput } from "./expense.schema";

type ExpenseWithCreator = Expense & { createdBy: { id: string; username: string; name: string } };

const toDto = (e: ExpenseWithCreator) => ({
  id: e.id,
  date: toDateString(e.date),
  category: e.category,
  amount: e.amount,
  note: e.note,
  createdBy: e.createdBy,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
});

// Snapshot untuk audit log: hanya nilai yang bermakna bisnis.
const snapshot = (e: Expense) => ({
  date: toDateString(e.date),
  category: e.category,
  amount: e.amount,
  note: e.note,
});

export const listMonth = async (month: string, category?: string) => {
  const items = await repo.findInRange(monthRange(month), category);
  return {
    month,
    items: items.map(toDto),
    total: sumExpenses(items),
    byCategory: totalsByCategory(items),
  };
};

export const listCategories = async () =>
  (await repo.listCategories()).map((c) => ({
    category: c.category,
    count: c._count._all,
    lastUsed: c._max.date ? toDateString(c._max.date) : null,
  }));

export const getById = async (id: string) => {
  const expense = await repo.findById(id);
  if (!expense) throw notFoundError();
  return toDto(expense);
};

export const create = (userId: string, input: CreateExpenseInput) =>
  prisma.$transaction(async (tx) => {
    const created = await repo.create(tx, {
      date: parseDateString(input.date),
      // Kategori teks bebas, tapi "solar" dan "Solar" tetap dianggap satu kategori.
      category: (await repo.findCategorySpelling(input.category, tx)) ?? input.category,
      amount: input.amount,
      note: input.note || null,
      createdById: userId,
    });
    await audit.record(tx, {
      userId,
      action: "create",
      entity: "Expense",
      entityId: created.id,
      after: snapshot(created),
    });
    return toDto(created);
  });

export const update = (userId: string, id: string, input: UpdateExpenseInput) =>
  prisma.$transaction(async (tx) => {
    const before = await repo.findById(id, tx);
    if (!before) throw notFoundError();
    const updated = await repo.update(tx, id, {
      date: input.date ? parseDateString(input.date) : undefined,
      category: input.category
        ? ((await repo.findCategorySpelling(input.category, tx)) ?? input.category)
        : undefined,
      amount: input.amount,
      // undefined = tidak diubah, null atau "" = catatan dihapus.
      note: input.note === undefined ? undefined : input.note || null,
    });
    await audit.record(tx, {
      userId,
      action: "update",
      entity: "Expense",
      entityId: id,
      before: snapshot(before),
      after: snapshot(updated),
    });
    return toDto(updated);
  });

export const remove = (userId: string, id: string) =>
  prisma.$transaction(async (tx) => {
    const before = await repo.findById(id, tx);
    if (!before) throw notFoundError();
    await repo.remove(tx, id);
    await audit.record(tx, {
      userId,
      action: "delete",
      entity: "Expense",
      entityId: id,
      before: snapshot(before),
    });
  });
