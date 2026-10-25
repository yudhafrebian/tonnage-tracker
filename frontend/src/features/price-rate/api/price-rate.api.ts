import api from "@/shared/lib/api";
import type { PriceRate, PriceRatePayload } from "../types/types";

// Urut turun berdasarkan effectiveFrom (terbaru dulu).
export const getPriceRatesApi = async () => {
  const res = await api.get<{ success: true; data: PriceRate[] }>("/price-rates");
  return res.data.data;
};

export const createPriceRateApi = async (payload: PriceRatePayload) => {
  const res = await api.post<{ success: true; data: PriceRate }>("/price-rates", payload);
  return res.data.data;
};

export const updatePriceRateApi = async (id: string, payload: Partial<PriceRatePayload>) => {
  const res = await api.patch<{ success: true; data: PriceRate }>(`/price-rates/${id}`, payload);
  return res.data.data;
};

// DELETE /price-rates/:id -> 204 tanpa body.
export const deletePriceRateApi = async (id: string) => {
  await api.delete(`/price-rates/${id}`);
};
