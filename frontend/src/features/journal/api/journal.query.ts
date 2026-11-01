import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import {
  copyStockApi,
  createEntriesApi,
  deleteEntryApi,
  getJournalDayApi,
  getJournalMonthApi,
  getLatestJournalDateApi,
  importJournalApi,
  updateEntryApi,
  type UpdateEntryPayload,
} from "./journal.api";

export const journalKeys = {
  all: ["journals"] as const,
  day: (date: string) => ["journals", "day", date] as const,
  month: (month: string) => ["journals", "month", month] as const,
  latest: ["journals", "latest"] as const,
};

export const useJournalDayQuery = (date: string) =>
  useQuery({
    queryKey: journalKeys.day(date),
    queryFn: () => getJournalDayApi(date),
  });

// keepPreviousData: strip tanggal tidak berkedip saat pindah bulan.
export const useJournalMonthQuery = (month: string) =>
  useQuery({
    queryKey: journalKeys.month(month),
    queryFn: () => getJournalMonthApi(month),
    placeholderData: keepPreviousData,
  });

export const useLatestJournalDateQuery = () =>
  useQuery({
    queryKey: journalKeys.latest,
    queryFn: getLatestJournalDateApi,
  });

// Dipakai dua kali: pratinjau (dryRun) lalu simpan. Data jurnal disegarkan setelah benar-benar disimpan.
export const useImportJournalMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: importJournalApi,
    onSuccess: (result) => {
      if (result.dryRun) return;
      toast.add({
        description: fill(dict.journal.importDialog.saved, { count: result.saved?.created ?? 0 }),
        type: "success",
      });
      return queryClient.invalidateQueries({ queryKey: journalKeys.all });
    },
  });
};

// Setelah input manual: segarkan jurnal (hari, strip bulan, tanggal terakhir).
const useJournalWrite = <T, V>(fn: (v: V) => Promise<T>, message: (result: T) => string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      toast.add({ description: message(result), type: "success" });
      return queryClient.invalidateQueries({ queryKey: journalKeys.all });
    },
  });
};

export const useCreateEntriesMutation = () => {
  const { dict } = useI18n();
  return useJournalWrite(createEntriesApi, () => dict.journalManual.saved);
};

export const useUpdateEntryMutation = () => {
  const { dict } = useI18n();
  return useJournalWrite(
    ({ id, payload }: { id: string; payload: UpdateEntryPayload }) => updateEntryApi(id, payload),
    () => dict.journalManual.saved,
  );
};

export const useDeleteEntryMutation = () => {
  const { dict } = useI18n();
  return useJournalWrite(deleteEntryApi, () => dict.journalManual.deleted);
};

export const useCopyStockMutation = () => {
  const { dict } = useI18n();
  const fmt = useFormatter();
  return useJournalWrite(copyStockApi, (r) =>
    fill(dict.journalManual.copied, { count: r.rows, date: fmt.date(r.from) }),
  );
};
