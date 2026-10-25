"use client"; // Error boundary wajib Client Component.

import { Button, buttonVariants } from "@/components/ui/button";
import { StatusMessage } from "@/shared/components/ui/status-message";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { AlertTriangleIcon, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

// Next 16: props-nya `error` & `retry` (bukan `reset`). Dirender di dalam layout dashboard,
// jadi sidebar & header tetap ada dan user bisa pindah halaman.
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useI18n().dict.status;
  // digest: penanda error dari Server Component, untuk dicocokkan dengan log server.
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusMessage
      icon={<AlertTriangleIcon />}
      title={t.errorTitle}
      description={t.errorDescription}
      actions={
        <>
          <Button onClick={() => retry()}>
            <RotateCw />
            {t.retry}
          </Button>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            {t.backHome}
          </Link>
        </>
      }
      footnote={digest && fill(t.errorCode, { digest })}
    />
  );
}
