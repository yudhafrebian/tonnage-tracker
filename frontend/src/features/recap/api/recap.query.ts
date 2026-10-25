import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRecapApi,
  deleteRecapApi,
  downloadImportTemplateApi,
  exportRecapApi,
  getMonthlyRecapApi,
  getRecapByDateApi,
  getYearlyRecapApi,
  importRecapApi,
  updateRecapApi,
} from "./recap.api";
import {
  CreateRecapPayload,
  InputMethod,
  MonthlyRecap,
  UpdateRecapPayload,
} from "../types/types";
import { toast } from "@/components/ui/toast";
import { downloadBlob } from "@/shared/lib/download";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { format as fill } from "@/shared/i18n/format";

// Mengambil data = useQuery (jalan otomatis, di-cache per bulan).
// useMutation hanya untuk mengubah data (tambah/edit/hapus/import).
export const recapKeys = {
  all: ["recaps"] as const,
  monthly: (month: string) => ["recaps", "monthly", month] as const,
  // Diawali "recaps" juga, jadi invalidate recapKeys.all ikut menyegarkan data tahunan.
  yearly: (year: string) => ["recaps", "yearly", year] as const,
  byDate: (date: string) => ["recaps", "date", date] as const,
};

export const useMonthlyRecapQuery = (month: string) => {
  return useQuery({
    queryKey: recapKeys.monthly(month),
    queryFn: () => getMonthlyRecapApi(month),
  });
};

export const useYearlyRecapQuery = (year: string) => {
  return useQuery({
    queryKey: recapKeys.yearly(year),
    queryFn: () => getYearlyRecapApi(year),
  });
};

// Satu rekap untuk form Edit. Data biasanya sudah ada di cache bulanan (tabel yang sedang tampil),
// jadi dipakai sebagai initialData: form langsung terisi tanpa request. Kalau tidak ada, ambil dari API.
export const useRecapByDateQuery = (date: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: recapKeys.byDate(date),
    queryFn: () => getRecapByDateApi(date),
    initialData: () =>
      queryClient
        .getQueryData<MonthlyRecap>(recapKeys.monthly(date.slice(0, 7)))
        ?.days.find((d) => d.date === date)?.recap ?? undefined,
  });
};

export const useUpdateRecapMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: ({
      date,
      payload,
      method,
    }: {
      date: string;
      payload: UpdateRecapPayload;
      method: InputMethod;
    }) => updateRecapApi(date, payload, method),
    onSuccess: () => {
      toast.add({ description: dict.recap.updated, type: "success" });
      return queryClient.invalidateQueries({ queryKey: recapKeys.all });
    },
  });
};

export const useCreateRecapMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    // Satu objek: mutationFn hanya menerima satu argumen data.
    mutationFn: ({
      payload,
      method,
    }: {
      payload: CreateRecapPayload;
      method: InputMethod;
    }) => createRecapApi(payload, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recapKeys.all });
      toast.add({
        description: dict.recap.created,
        type: "success",
      });
    },
  });
};

export const useDeleteRecapMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: (date: string) => deleteRecapApi(date),
    onSuccess: () => {
      toast.add({ description: dict.recap.deleted, type: "success" });
      // return: dialog baru tertutup setelah tabel & total selesai diperbarui.
      return queryClient.invalidateQueries({ queryKey: recapKeys.all });
    },
  });
};

// Dipakai dua kali: pratinjau (dryRun: true) lalu simpan (dryRun: false).
// Data rekap hanya disegarkan setelah benar-benar disimpan.
export const useImportRecapMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: importRecapApi,
    onSuccess: (result) => {
      if (result.dryRun) return;
      const saved = result.summary.create + result.summary.update;
      toast.add({ description: fill(dict.recap.importDialog.imported, { count: saved }), type: "success" });
      return queryClient.invalidateQueries({ queryKey: recapKeys.all });
    },
  });
};

// Mutation (bukan query): export dipicu klik, tidak perlu di-cache.
export const useExportRecapMutation = () => {
  const { dict } = useI18n();

  return useMutation({
    mutationFn: (month: string) => exportRecapApi(month),
    onSuccess: ({ blob, fileName }) => {
      downloadBlob(blob, fileName);
    },
    onError: (error) => {
      toast.add({ description: apiErrorMessage(dict, error), type: "error" });
    },
  });
};

export const useDownloadImportTemplateMutation = () => {
  const { dict } = useI18n();

  return useMutation({
    mutationFn: (month: string) => downloadImportTemplateApi(month),
    onSuccess: ({ blob, fileName }) => {
      downloadBlob(blob, fileName);
    },
    onError: (error) => {
      toast.add({ description: apiErrorMessage(dict, error), type: "error" });
    },
  });
};
