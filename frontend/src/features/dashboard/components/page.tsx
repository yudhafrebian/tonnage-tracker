"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MonthSelector from "@/features/recap/components/month-selector";
import { currentMonth, formatMonth } from "@/features/recap/lib/month";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { RotateCw } from "lucide-react";
import { useState } from "react";
import { useDashboardSummaryQuery } from "../api/dashboard.query";
import AttentionCard from "./attention-card";
import DailyChart from "./daily-chart";
import KpiTiles from "./kpi-tiles";
import MonthlyChart from "./monthly-chart";

const DashboardPage = () => {
  const { lang, dict } = useI18n();
  const t = dict.dashboard;
  const fmt = useFormatter();
  const [month, setMonth] = useState(currentMonth);
  const { data, isPending, error, refetch, isRefetching } = useDashboardSummaryQuery(month);

  // "Data s/d 25 Okt · dibandingkan dengan 1 Sep – 25 Sep": pembanding periodenya sama panjang.
  const period = data?.previous.period;
  const subtitle = !data
    ? null
    : data.asOf === null
      ? t.notStarted
      : [
          fill(t.asOf, { date: fmt.dayMonth(data.asOf) }),
          period && fill(t.comparedTo, { from: fmt.dayMonth(period.from), to: fmt.dayMonth(period.to) }),
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold md:text-3xl">
            {t.title} {formatMonth(month, lang)}
          </h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : (
            <Skeleton className="h-4 w-64" />
          )}
        </div>
        <MonthSelector value={month} onChange={setMonth} label={formatMonth(month, lang)} />
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-md border p-10 text-center">
          <p className="text-destructive">{apiErrorMessage(dict, error)}</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            <RotateCw className={isRefetching ? "animate-spin" : undefined} />
            {t.retry}
          </Button>
        </div>
      ) : (
        <>
          <KpiTiles data={data} />
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <DailyChart month={month} />
            </div>
            <AttentionCard data={data} />
          </div>
          <MonthlyChart
            month={month}
            hasFinance={data.current.income !== undefined}
            onPickMonth={setMonth}
          />
        </>
      )}
    </div>
  );
};

export default DashboardPage;
