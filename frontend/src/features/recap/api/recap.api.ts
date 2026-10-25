import api from "@/shared/lib/api";
import type {
  CreateRecapPayload,
  ImportConflict,
  ImportResult,
  InputMethod,
  MonthlyRecap,
  Recap,
  UpdateRecapPayload,
  YearlyRecap,
} from "../types/types";

export const getMonthlyRecapApi = async (month: string) => {
  const res = await api.get<{ success: true; data: MonthlyRecap }>("/recaps", {
    params: { month },
  });
  return res.data.data;
};

export const getYearlyRecapApi = async (year: string) => {
  const res = await api.get<{ success: true; data: YearlyRecap }>(
    "/recaps/yearly",
    { params: { year } },
  );
  return res.data.data;
};

// POST /recaps?method=total_export   body: { date, process, packing, stock, note? }
export const createRecapApi = async (
  payload: CreateRecapPayload,
  method: InputMethod,
) => {
  const res = await api.post<{ success: true; data: Recap }>(
    "/recaps",
    payload,
    {
      params: { method },
    },
  );
  return res.data.data;
};

// GET /recaps/2026-10-05 -> satu rekap (404 kalau belum ada).
export const getRecapByDateApi = async (date: string) => {
  const res = await api.get<{ success: true; data: Recap }>(`/recaps/${date}`);
  return res.data.data;
};

// PATCH /recaps/2026-10-05?method=export_local   body: { process?, packing?, stock?, note? }
export const updateRecapApi = async (
  date: string,
  payload: UpdateRecapPayload,
  method: InputMethod,
) => {
  const res = await api.patch<{ success: true; data: Recap }>(`/recaps/${date}`, payload, {
    params: { method },
  });
  return res.data.data;
};

// POST /recaps/import?month=&dryRun=&onConflict=  (multipart, field "file").
// dryRun=true: hanya pratinjau, tidak ada yang disimpan.
export const importRecapApi = async (params: {
  month: string;
  file: File;
  dryRun: boolean;
  onConflict: ImportConflict;
}) => {
  const body = new FormData();
  body.append("file", params.file);
  const res = await api.post<{ success: true; data: ImportResult }>("/recaps/import", body, {
    params: { month: params.month, dryRun: String(params.dryRun), onConflict: params.onConflict },
  });
  return res.data.data;
};

// DELETE /recaps/2026-10-05 -> 204 tanpa body.
export const deleteRecapApi = async (date: string) => {
  await api.delete(`/recaps/${date}`);
};

// GET /recaps/export?month=YYYY-MM -> file .xlsx. Untuk VIEWER, backend otomatis
// tidak menyertakan kolom & sheet keuangan.
export const exportRecapApi = async (month: string) => {
  const res = await api.get<Blob>("/recaps/export", {
    params: { month },
    responseType: "blob",
  });
  // Nama file disusun di sini (sama dengan backend: Rekap-YYYY-MM.xlsx), karena header
  // Content-Disposition tidak bisa dibaca lintas origin tanpa CORS exposedHeaders.
  return { blob: res.data, fileName: `Rekap-${month}.xlsx` };
};

// GET /recaps/template?month=YYYY-MM -> sheet REKAP kosong untuk diisi lalu diimport.
export const downloadImportTemplateApi = async (month: string) => {
  const res = await api.get<Blob>("/recaps/template", {
    params: { month },
    responseType: "blob",
  });
  return { blob: res.data, fileName: `Template-Rekap-${month}.xlsx` };
};