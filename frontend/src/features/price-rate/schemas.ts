import z from "zod";
import type { Dictionary } from "@/shared/i18n/types";

// Batas yang sama dengan backend (price-rate.schema.ts).
const MAX_PRICE = 10_000_000;

export const makePriceRateSchema = (m: Dictionary["priceRate"]["validation"]) =>
  z.object({
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, m.date),
    pricePerKg: z
      .number({ error: m.priceRequired })
      .int(m.priceRequired)
      .positive(m.pricePositive)
      .max(MAX_PRICE, m.priceTooLarge),
  });

export type PriceRateFormValues = z.infer<ReturnType<typeof makePriceRateSchema>>;
