// Sesuai respons GET /price-rates (lihat backend price-rate.service.ts toDto).
export type PriceRate = {
  id: string;
  effectiveFrom: string; // "2026-10-01"
  pricePerKg: number; // rupiah, bilangan bulat
  createdAt: string;
  updatedAt: string;
};

export type PriceRatePayload = {
  effectiveFrom: string;
  pricePerKg: number;
};

export type RateStatus = "scheduled" | "active" | "past";

// Satu baris riwayat: tarif + rentang berlakunya + perubahan dari tarif sebelumnya.
export type RateRow = PriceRate & {
  until: string | null; // tanggal terakhir berlaku; null = sampai sekarang / seterusnya
  status: RateStatus;
  changePct: number | null; // null untuk tarif pertama
};

export type PriceRateDialogState =
  | { type: null }
  | { type: "create" }
  | { type: "edit"; rate: PriceRate }
  | { type: "delete"; rate: PriceRate };
