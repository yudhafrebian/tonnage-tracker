import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePasswordApi, loginApi, logoutApi, meApi } from "./auth.api";
import { toast } from "@/components/ui/toast";
import { Me } from "../types/type";
import { useI18n } from "@/shared/i18n/i18n-provider";

export const useLoginMutation = () => {
  const queryClient = useQueryClient();
  const { dict } = useI18n();

  return useMutation({
    mutationFn: loginApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.add({ description: dict.login.success, type: "success" });
    },
  });
};

export const useLogoutMutation = () => {
  return useMutation({
    mutationFn: logoutApi,
  });
};

export const useChangePasswordMutation = () => {
  const { dict } = useI18n();

  return useMutation({
    mutationFn: changePasswordApi,
    onSuccess: () => {
      toast.add({ description: dict.settings.password.success, type: "success" });
    },
  });
};

export const useMeQuery = () => {
  return useQuery({
    queryKey: ["user"],
    queryFn: meApi,
    select: (res): Me => res.data,
    retry: false,
    staleTime: 5 * 60_000,
  });
};
