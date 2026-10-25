"use client";

import { buttonVariants } from "@/components/ui/button";
import { StatusMessage } from "@/shared/components/ui/status-message";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { CompassIcon } from "lucide-react";
import Link from "next/link";

// 404 di dalam shell dashboard (sidebar tetap tampil). Dipicu oleh [...missing]/page.tsx.
export default function DashboardNotFound() {
  const t = useI18n().dict.status;

  return (
    <StatusMessage
      icon={<CompassIcon />}
      code="404"
      title={t.notFoundTitle}
      description={t.notFoundDescription}
      actions={
        <Link href="/dashboard" className={buttonVariants()}>
          {t.backHome}
        </Link>
      }
    />
  );
}
