import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/shared/i18n/i18n-provider";
import {
  createPriceRateApi,
  deletePriceRateApi,
  getPriceRatesApi,
  updatePriceRateApi,
} from "./price-rate.api";
import type { PriceRatePayload } from "../types/types";

export const priceRateKeys = {
  all: ["price-rates"] as const,
};

// Pemasukan di rekap & dashboard dihitung dari tarif, jadi ikut disegarkan.
const invalidateAfterChange = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: priceRateKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["recaps"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  ]);

export const usePriceRatesQuery = () => {
  return useQuery({
    queryKey: priceRateKeys.all,
    queryFn: getPriceRatesApi,
  });
};

export const useCreatePriceRateMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: (payload: PriceRatePayload) => createPriceRateApi(payload),
    onSuccess: () => {
      toast.add({ description: dict.priceRate.created, type: "success" });
      return invalidateAfterChange(queryClient);
    },
  });
};

export const useUpdatePriceRateMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PriceRatePayload }) =>
      updatePriceRateApi(id, payload),
    onSuccess: () => {
      toast.add({ description: dict.priceRate.updated, type: "success" });
      return invalidateAfterChange(queryClient);
    },
  });
};

export const useDeletePriceRateMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: (id: string) => deletePriceRateApi(id),
    onSuccess: () => {
      toast.add({ description: dict.priceRate.deleted, type: "success" });
      return invalidateAfterChange(queryClient);
    },
  });
};
