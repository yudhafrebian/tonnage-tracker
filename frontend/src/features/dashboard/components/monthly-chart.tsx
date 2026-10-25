"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMonth } from "@/features/recap/lib/month";
import { BarChart, ChartLegend, type BarDatum } from "@/shared/components/ui/bar-chart";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { useState } from "react";
import { useMonthlyTrendQuery } from "../api/dashboard.query";

type Metric = "process" | "packing" | "income" | "profit";

const EXPORT = "bg-primary";
const LOCAL = "bg-primary/40";

interface MonthlyChartProps {
  month: string; // bulan terpilih = bulan terakhir di grafik
  hasFinance: boolean;
  onPickMonth: (month: string) => void;
}

const MonthlyChart = ({ month, hasFinance, onPickMonth }: MonthlyChartProps) => {
  const { lang, dict } = useI18n();
  const t = dict.dashboard;
  const parts = dict.recap.parts;
  const fmt = useFormatter();
  const [metric, setMetric] = useState<Metric>("process");
  const { data } = useMonthlyTrendQuery(month);
  const isKg = metric === "process" || metric === "packing";

  const bars: BarDatum[] = (data?.months ?? []).map((m) => {
    const name = formatMonth(m.month, lang);
    const empty = m.recordedDays === 0;
    if (isKg) {
      const s = m[metric];
      return {
        key: m.month,
        label: fmt.monthShort(`${m.month}-01`),
        active: m.month === month,
        segments: empty
          ? null
          : [
              { value: s.export, className: EXPORT },
              { value: s.local, className: LOCAL },
            ],
        ariaLabel: `${name}: ${fmt.kg(s.total)} ${t.kgUnit}`,
        tooltip: (
          <div className="flex flex-col gap-0.5 tabular-nums">
            <p className="font-medium">{name}</p>
            {empty ? (
              <p>{t.noData}</p>
            ) : (
              <>
                <p>{parts.export}: {fmt.kg(s.export)} {t.kgUnit}</p>
                <p>{parts.local}: {fmt.kg(s.local)} {t.kgUnit}</p>
                <p className="font-medium">{parts.total}: {fmt.kg(s.total)} {t.kgUnit}</p>
              </>
            )}
          </div>
        ),
      };
    }
    const value = m[metric] ?? 0;
    return {
      key: m.month,
      label: fmt.monthShort(`${m.month}-01`),
      active: m.month === month,
      // Pengeluaran bisa ada tanpa rekap, jadi laba tetap ditampilkan walau belum ada rekap.
      segments: value === 0 && empty ? null : [{ value, className: value < 0 ? "bg-destructive" : EXPORT }],
      ariaLabel: `${name}: ${fmt.rupiah(value)}`,
      tooltip: (
        <div className="flex flex-col gap-0.5 tabular-nums">
          <p className="font-medium">{name}</p>
          <p>{fmt.rupiah(value)}</p>
          {metric === "profit" && (
            <p className="text-xs opacity-80">
              {dict.recap.income} {fmt.rupiah(m.income ?? 0)} · {dict.recap.expense}{" "}
              {fmt.rupiah(m.expense ?? 0)}
            </p>
          )}
        </div>
      ),
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b">
        <div className="flex flex-col gap-1">
          <CardTitle>{t.monthly}</CardTitle>
          <CardDescription>{t.clickMonth}</CardDescription>
        </div>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList>
            <TabsTrigger value="process">{t.metrics.process}</TabsTrigger>
            <TabsTrigger value="packing">{t.metrics.packing}</TabsTrigger>
            {hasFinance && <TabsTrigger value="income">{t.metrics.income}</TabsTrigger>}
            {hasFinance && <TabsTrigger value="profit">{t.metrics.profit}</TabsTrigger>}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Satu seri (uang) tidak perlu legenda: judul tab sudah menyebutkannya. */}
        {isKg && (
          <ChartLegend
            items={[
              { label: parts.export, className: EXPORT },
              { label: parts.local, className: LOCAL },
            ]}
          />
        )}
        {data ? (
          <BarChart
            className="h-64"
            data={bars}
            formatTick={fmt.compact}
            onBarClick={onPickMonth}
          />
        ) : (
          <Skeleton className="h-64" />
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyChart;
