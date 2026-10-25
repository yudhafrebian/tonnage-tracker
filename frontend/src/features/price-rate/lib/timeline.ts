import { format, parse, subDays } from "date-fns";
import type { PriceRate, RateRow } from "../types/types";

const DAY = "yyyy-MM-dd";
const dayBefore = (date: string) => format(subDays(parse(date, DAY, new Date()), 1), DAY);

// `rates` urut turun (terbaru dulu), sama dengan respons backend.
// Tarif berlaku dari effectiveFrom sampai sehari sebelum tarif yang lebih baru (backend: priceAt).
export function buildTimeline(rates: PriceRate[], today: string): RateRow[] {
  // Tarif aktif = yang terbaru dengan effectiveFrom <= hari ini.
  const activeId = rates.find((r) => r.effectiveFrom <= today)?.id;

  return rates.map((rate, i) => {
    const newer = rates[i - 1];
    const older = rates[i + 1];
    return {
      ...rate,
      until: newer ? dayBefore(newer.effectiveFrom) : null,
      status: rate.id === activeId ? "active" : rate.effectiveFrom > today ? "scheduled" : "past",
      changePct: older
        ? Math.round(((rate.pricePerKg - older.pricePerKg) / older.pricePerKg) * 1000) / 10
        : null,
    };
  });
}
