import z from "zod";
import { dateString } from "../../lib/validators";

const pricePerKg = z.number().int().positive().max(10_000_000);

export const createPriceRateSchema = z.strictObject({
  effectiveFrom: dateString,
  pricePerKg,
});

export const updatePriceRateSchema = z
  .strictObject({
    effectiveFrom: dateString.optional(),
    pricePerKg: pricePerKg.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");
