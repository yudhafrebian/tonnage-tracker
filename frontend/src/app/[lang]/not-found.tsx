"use client";

import { buttonVariants } from "@/components/ui/button";
import { StatusMessage } from "@/shared/components/ui/status-message";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { CompassIcon } from "lucide-react";
import Link from "next/link";

// 404 di luar dashboard. "/" mengarahkan ke dashboard kalau sudah login, ke form login kalau belum (proxy.ts).
export default function NotFound() {
  const t = useI18n().dict.status;

  return (
    <main className="flex flex-1 items-center justify-center">
      <StatusMessage
        icon={<CompassIcon />}
        code="404"
        title={t.notFoundTitle}
        description={t.notFoundDescription}
        actions={
          <Link href="/" className={buttonVariants()}>
            {t.backHome}
          </Link>
        }
      />
    </main>
  );
}
