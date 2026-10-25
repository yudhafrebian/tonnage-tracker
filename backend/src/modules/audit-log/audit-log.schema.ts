import z from "zod";
import { dateString } from "../../lib/validators";

export const listAuditLogQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(), // inklusif
  userId: z.uuid().optional(),
  entity: z.enum(["DailyRecap", "PriceRate", "Expense"]).optional(),
  entityId: z.string().min(1).max(64).optional(),
  action: z.enum(["create", "update", "delete", "import"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});
