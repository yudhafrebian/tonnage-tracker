import api from "@/shared/lib/api";
import type { Discrepancy, DiscrepancyList, DiscrepancyPayload, DiscrepancyStatus } from "../types/types";

// Tanpa status = semua. openCount selalu jumlah yang belum selesai.
export const getDiscrepanciesApi = async (status?: DiscrepancyStatus) => {
  const res = await api.get<{ success: true; data: DiscrepancyList }>("/discrepancies", { params: { status } });
  return res.data.data;
};

export const createDiscrepancyApi = async (payload: DiscrepancyPayload) => {
  const res = await api.post<{ success: true; data: Discrepancy }>("/discrepancies", payload);
  return res.data.data;
};

export type UpdateDiscrepancyPayload = Partial<DiscrepancyPayload> & {
  status?: DiscrepancyStatus;
  resolution?: string | null;
};

export const updateDiscrepancyApi = async (id: string, payload: UpdateDiscrepancyPayload) => {
  const res = await api.patch<{ success: true; data: Discrepancy }>(`/discrepancies/${id}`, payload);
  return res.data.data;
};

// DELETE -> 204 tanpa body.
export const deleteDiscrepancyApi = async (id: string) => {
  await api.delete(`/discrepancies/${id}`);
};
