"use client"

import { useRouter } from "next/navigation";
import {
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
} from "../api/auth.query";
import { ILoginPayload } from "../types/type";
import { can, Permission } from "@/shared/lib/permissions";

// ?next= diisi proxy.ts saat user dilempar ke login. Hanya terima path dashboard internal,
// supaya link login tidak bisa dipakai untuk redirect ke situs lain ("//evil.com").
const nextPath = () => {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/dashboard") && !next.startsWith("//") ? next : "/dashboard";
};

export const useLogin = () => {
  const router = useRouter();
  const { mutate, isPending, error } = useLoginMutation();

  const handleLogin = (payload: ILoginPayload) => {
    mutate(payload, {
      onSuccess: () => {
        // Dibaca saat submit (bukan useSearchParams) supaya halaman login tidak perlu Suspense.
        router.push(nextPath());
      },
    });
  };

  return {
    handleLogin,
    isPending,
    error,
  };
};

export const useLogout = () => {
  const { mutate, isPending, error, reset } = useLogoutMutation();

  const handleLogout = () => {
    mutate(undefined, {
      onSuccess: () => {    
        window.location.replace("/");
      },
    });
  };

  return {
    handleLogout,
    isPending,
    error,
    reset,
  };
};

export const usePermission = (p: Permission) => {
  const { data, isPending } = useMeQuery();
  return { allowed: can(data?.role, p), isPending };
};
