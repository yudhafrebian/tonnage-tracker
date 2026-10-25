"use client";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { AlertTriangleIcon, BellIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";
import Link from "next/link";
import type { DashboardSummary } from "../types/types";

// Status kelengkapan input bulan ini, dengan jalan pintas ke halaman Rekap.
const AttentionCard = ({ data }: { data: DashboardSummary }) => {
  const t = useI18n().dict.dashboard;
  const fmt = useFormatter();
  const { current, asOf } = data;

  return (
    <Card className="h-fit">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <BellIcon size={22} /> {t.attention}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {asOf === null ? (
          <p className="flex items-start gap-2 text-muted-foreground">
            <ClockIcon className="mt-0.5 size-4 shrink-0" />
            {t.notStarted}
          </p>
        ) : current.missingDays > 0 ? (
          <p className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            {fill(t.missingDays, { count: current.missingDays })}
          </p>
        ) : (
          <p className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
            {fill(t.allFilled, { date: fmt.dayMonth(asOf) })}
          </p>
        )}
        {asOf !== null && (
          <p className="text-muted-foreground">
            {fill(t.recordedDays, { count: current.recordedDays })}
          </p>
        )}
        <Link
          href="/dashboard/recap"
          className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}
        >
          {t.openRecap}
        </Link>
      </CardContent>
    </Card>
  );
};

export default AttentionCard;
