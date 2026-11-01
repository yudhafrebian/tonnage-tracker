import api from "@/shared/lib/api";
import type {
  ImportMarkets,
  ImportPreview,
  JournalDay,
  JournalEntry,
  JournalMonth,
  JournalSection,
  Market,
} from "../types/types";

export const getJournalDayApi = async (date: string) => {
  const res = await api.get<{ success: true; data: JournalDay }>("/journals", { params: { date } });
  return res.data.data;
};

export const getJournalMonthApi = async (month: string) => {
  const res = await api.get<{ success: true; data: JournalMonth }>("/journals/month", { params: { month } });
  return res.data.data;
};

// Tanggal terakhir yang punya jurnal; null kalau belum ada sama sekali.
export const getLatestJournalDateApi = async () => {
  const res = await api.get<{ success: true; data: { date: string | null } }>("/journals/latest");
  return res.data.data.date;
};

// POST /journals/import?dryRun= (multipart: file, dan markets JSON saat menyimpan).
export const importJournalApi = async (params: { file: File; dryRun: boolean; markets?: ImportMarkets }) => {
  const body = new FormData();
  body.append("file", params.file);
  if (params.markets) body.append("markets", JSON.stringify(params.markets));
  const res = await api.post<{ success: true; data: ImportPreview }>("/journals/import", body, {
    params: { dryRun: String(params.dryRun) },
  });
  return res.data.data;
};

// ---------- Input manual ----------

export type CreateEntriesPayload = {
  date: string;
  section: JournalSection;
  party: string;
  market: Market;
  rows: { item: string; size: string | null; mc: number | null; kg: number }[];
};

export type UpdateEntryPayload = Partial<{
  party: string;
  item: string;
  size: string | null;
  mc: number | null;
  kg: number;
  market: Market;
}>;

export const createEntriesApi = async (payload: CreateEntriesPayload) => {
  const res = await api.post<{ success: true; data: JournalEntry[] }>("/journals/entries", payload);
  return res.data.data;
};

export const updateEntryApi = async (id: string, payload: UpdateEntryPayload) => {
  const res = await api.patch<{ success: true; data: JournalEntry }>(`/journals/entries/${id}`, payload);
  return res.data.data;
};

// DELETE -> 204 tanpa body.
export const deleteEntryApi = async (id: string) => {
  await api.delete(`/journals/entries/${id}`);
};

// Salin sisa stok dari tanggal terakhir sebelumnya ke `date`.
export const copyStockApi = async (date: string) => {
  const res = await api.post<{ success: true; data: { from: string; rows: number } }>("/journals/copy-stock", { date });
  return res.data.data;
};
