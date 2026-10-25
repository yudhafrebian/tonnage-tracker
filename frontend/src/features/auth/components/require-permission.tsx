"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Permission } from "@/shared/lib/permissions";
import { Spinner } from "@/components/ui/spinner";
import { usePermission } from "../hooks/useAuth";
import { useI18n } from "@/shared/i18n/i18n-provider";

export function RequirePermission({
  permission,
  children,
  redirectTo,
}: {
  permission: Permission;
  children: React.ReactNode;
  redirectTo?: string; // kalau diisi: tendang ke URL ini, bukan tampilkan pesan
}) {
  const { allowed, isPending } = usePermission(permission);
  const router = useRouter();
  const { dict } = useI18n();

  useEffect(() => {
    if (!isPending && !allowed && redirectTo) router.replace(redirectTo);
  }, [isPending, allowed, redirectTo, router]);

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!allowed) {
    return redirectTo ? null : (
      <p className="p-6 text-muted-foreground">{dict.access.denied}</p>
    );
  }
  return children;
}
