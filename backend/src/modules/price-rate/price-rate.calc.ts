import type { PriceRate } from "../../generated/prisma/client";

// `rates` harus urut naik berdasarkan effectiveFrom. null kalau belum ada tarif yang berlaku.
export const priceAt = (rates: PriceRate[], date: Date): number | null => {
  let price: number | null = null;
  for (const r of rates) {
    if (r.effectiveFrom.getTime() > date.getTime()) break;
    price = r.pricePerKg;
  }
  return price;
};
