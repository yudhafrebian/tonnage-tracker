import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/shared/i18n/i18n-provider";
import {
  createDiscrepancyApi,
  deleteDiscrepancyApi,
  getDiscrepanciesApi,
  updateDiscrepancyApi,
  type UpdateDiscrepancyPayload,
} from "./discrepancy.api";
import type { DiscrepancyStatus } from "../types/types";

export const discrepancyKeys = {
  all: ["discrepancies"] as const,
  list: (status?: DiscrepancyStatus) => ["discrepancies", status ?? "ALL"] as const,
};

export const useDiscrepanciesQuery = (status?: DiscrepancyStatus) =>
  useQuery({
    queryKey: discrepancyKeys.list(status),
    queryFn: () => getDiscrepanciesApi(status),
    placeholderData: keepPreviousData,
  });

const useDiscrepancyWrite = <T, V>(fn: (v: V) => Promise<T>, message: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.add({ description: message, type: "success" });
      return queryClient.invalidateQueries({ queryKey: discrepancyKeys.all });
    },
  });
};

export const useCreateDiscrepancyMutation = () =>
  useDiscrepancyWrite(createDiscrepancyApi, useI18n().dict.discrepancy.created);

export const useUpdateDiscrepancyMutation = () =>
  useDiscrepancyWrite(
    ({ id, payload }: { id: string; payload: UpdateDiscrepancyPayload }) => updateDiscrepancyApi(id, payload),
    useI18n().dict.discrepancy.updated,
  );

export const useDeleteDiscrepancyMutation = () =>
  useDiscrepancyWrite(deleteDiscrepancyApi, useI18n().dict.discrepancy.deleted);
