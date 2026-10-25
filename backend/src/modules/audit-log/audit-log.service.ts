import z from "zod";
import { addDays, parseDateString } from "../../lib/date";
import * as repo from "./audit-log.repository";
import { listAuditLogQuerySchema } from "./audit-log.schema";

export const list = async (query: z.infer<typeof listAuditLogQuerySchema>) => {
  const { items, total } = await repo.list({
    ...query,
    from: query.from ? parseDateString(query.from) : undefined,
    // "to" inklusif: semua log di tanggal itu ikut, jadi batasnya awal hari berikutnya.
    to: query.to ? addDays(parseDateString(query.to), 1) : undefined,
  });
  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
};
