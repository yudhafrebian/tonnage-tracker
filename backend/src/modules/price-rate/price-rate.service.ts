import z from "zod";
import { prisma } from "../../config/prisma";
import type { PriceRate } from "../../generated/prisma/client";
import { parseDateString, toDateString } from "../../lib/date";
import { notFoundError } from "../../lib/errors";
import * as audit from "../audit-log/audit-log.repository";
import * as repo from "./price-rate.repository";
import { createPriceRateSchema, updatePriceRateSchema } from "./price-rate.schema";

export const toDto = (r: PriceRate) => ({
  id: r.id,
  effectiveFrom: toDateString(r.effectiveFrom),
  pricePerKg: r.pricePerKg,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

// Snapshot untuk audit log: hanya nilai yang bermakna bisnis.
const snapshot = (r: PriceRate) => ({
  effectiveFrom: toDateString(r.effectiveFrom),
  pricePerKg: r.pricePerKg,
});

export const list = async () => (await repo.listAll()).map(toDto);

export const create = (
  userId: string,
  input: z.infer<typeof createPriceRateSchema>,
) =>
  prisma.$transaction(async (tx) => {
    const created = await repo.create(tx, {
      effectiveFrom: parseDateString(input.effectiveFrom),
      pricePerKg: input.pricePerKg,
    });
    await audit.record(tx, {
      userId,
      action: "create",
      entity: "PriceRate",
      entityId: created.id,
      after: snapshot(created),
    });
    return toDto(created);
  });

export const update = (
  userId: string,
  id: string,
  input: z.infer<typeof updatePriceRateSchema>,
) =>
  prisma.$transaction(async (tx) => {
    const before = await repo.findById(tx, id);
    if (!before) throw notFoundError();
    const updated = await repo.update(tx, id, {
      effectiveFrom: input.effectiveFrom
        ? parseDateString(input.effectiveFrom)
        : undefined,
      pricePerKg: input.pricePerKg,
    });
    await audit.record(tx, {
      userId,
      action: "update",
      entity: "PriceRate",
      entityId: id,
      before: snapshot(before),
      after: snapshot(updated),
    });
    return toDto(updated);
  });

export const remove = (userId: string, id: string) =>
  prisma.$transaction(async (tx) => {
    const before = await repo.findById(tx, id);
    if (!before) throw notFoundError();
    await repo.remove(tx, id);
    await audit.record(tx, {
      userId,
      action: "delete",
      entity: "PriceRate",
      entityId: id,
      before: snapshot(before),
    });
  });
