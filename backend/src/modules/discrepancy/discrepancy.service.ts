import { prisma } from "../../config/prisma";
import type { StockDiscrepancy } from "../../generated/prisma/client";
import { monthRange, parseDateString, toDateString } from "../../lib/date";
import { notFoundError } from "../../lib/errors";
import * as audit from "../audit-log/audit-log.repository";
import * as repo from "./discrepancy.repository";
import type { CreateDiscrepancyInput, UpdateDiscrepancyInput } from "./discrepancy.schema";

type WithCreator = StockDiscrepancy & { createdBy: { id: string; username: string; name: string } };

const num = (d: StockDiscrepancy["kgDiff"]) => (d === null ? null : d.toNumber());

const toDto = (d: WithCreator) => ({
  id: d.id,
  date: toDateString(d.date),
  party: d.party,
  item: d.item,
  size: d.size,
  mcDiff: num(d.mcDiff),
  kgDiff: num(d.kgDiff),
  cause: d.cause,
  note: d.note,
  status: d.status,
  resolution: d.resolution,
  resolvedAt: d.resolvedAt,
  createdBy: d.createdBy,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

// Snapshot untuk audit log: hanya nilai yang bermakna bisnis.
const snapshot = (d: StockDiscrepancy) => ({
  date: toDateString(d.date),
  party: d.party,
  item: d.item,
  size: d.size,
  mcDiff: num(d.mcDiff),
  kgDiff: num(d.kgDiff),
  cause: d.cause,
  note: d.note,
  status: d.status,
  resolution: d.resolution,
});

export const list = async (filter: { status?: "OPEN" | "RESOLVED"; month?: string }) => {
  const [items, openCount] = await Promise.all([
    repo.list({ status: filter.status, range: filter.month ? monthRange(filter.month) : undefined }),
    repo.countOpen(),
  ]);
  return { items: items.map(toDto), openCount };
};

export const create = (userId: string, input: CreateDiscrepancyInput) =>
  prisma.$transaction(async (tx) => {
    const created = await repo.create(tx, {
      date: parseDateString(input.date),
      party: input.party,
      item: input.item,
      size: input.size ?? null,
      mcDiff: input.mcDiff ?? null,
      kgDiff: input.kgDiff ?? null,
      cause: input.cause,
      note: input.note ?? null,
      createdById: userId,
    });
    await audit.record(tx, {
      userId,
      action: "create",
      entity: "StockDiscrepancy",
      entityId: created.id,
      after: snapshot(created),
    });
    return toDto(created);
  });

export const update = (userId: string, id: string, input: UpdateDiscrepancyInput) =>
  prisma.$transaction(async (tx) => {
    const before = await repo.findById(id, tx);
    if (!before) throw notFoundError();
    // Waktu selesai dicatat saat status berubah ke RESOLVED, dikosongkan saat dibuka lagi.
    const resolvedAt =
      input.status === "RESOLVED" && before.status !== "RESOLVED"
        ? new Date()
        : input.status === "OPEN"
          ? null
          : undefined;
    const updated = await repo.update(tx, id, {
      ...input,
      date: input.date ? parseDateString(input.date) : undefined,
      resolvedAt,
    });
    await audit.record(tx, {
      userId,
      action: "update",
      entity: "StockDiscrepancy",
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
    await audit.record(tx, { userId, action: "delete", entity: "StockDiscrepancy", entityId: id, before: snapshot(before) });
  });
