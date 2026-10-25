"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, ChartLegend, type BarDatum } from "@/shared/components/ui/bar-chart";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { useState } from "react";
import { useDailyTrendQuery } from "../api/dashboard.query";

type Metric = "process" | "packing";

// Ekspor & Lokal: satu hue, dua tingkat terang (bagian dari satu total).
const EXPORT = "bg-primary";
const LOCAL = "bg-primary/40";

const DailyChart = ({ month }: { month: string }) => {
  const { dict } = useI18n();
  const t = dict.dashboard;
  const parts = dict.recap.parts;
  const fmt = useFormatter();
  const [metric, setMetric] = useState<Metric>("process");
  const { data } = useDailyTrendQuery(month);

  const bars: BarDatum[] = (data?.days ?? []).map((d) => {
    const exp = metric === "process" ? d.processExport : d.packingExport;
    const loc = metric === "process" ? d.processLocal : d.packingLocal;
    const recorded = exp !== null && loc !== null;
    const date = fmt.dayMonth(d.date);
    return {
      key: d.date,
      label: String(Number(d.date.slice(8, 10))),
      segments: recorded
        ? [
            { value: exp, className: EXPORT },
            { value: loc, className: LOCAL },
          ]
        : null,
      ariaLabel: recorded ? `${date}: ${fmt.kg(exp + loc)} ${t.kgUnit}` : `${date}: ${t.noData}`,
      tooltip: recorded ? (
        <div className="flex flex-col gap-0.5 tabular-nums">
          <p className="font-medium">{date}</p>
          <p>{parts.export}: {fmt.kg(exp)} {t.kgUnit}</p>
          <p>{parts.local}: {fmt.kg(loc)} {t.kgUnit}</p>
          <p className="font-medium">{parts.total}: {fmt.kg(exp + loc)} {t.kgUnit}</p>
        </div>
      ) : (
        <p>{date}: {t.noData}</p>
      ),
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b">
        <CardTitle>{fill(t.daily, { section: dict.recap.sections[metric] })}</CardTitle>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <TabsList>
            <TabsTrigger value="process">{t.metrics.process}</TabsTrigger>
            <TabsTrigger value="packing">{t.metrics.packing}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartLegend
          items={[
            { label: parts.export, className: EXPORT },
            { label: parts.local, className: LOCAL },
          ]}
        />
        {data ? (
          <BarChart className="h-64" data={bars} formatTick={fmt.compact} labelEvery={5} />
        ) : (
          <Skeleton className="h-64" />
        )}
      </CardContent>
    </Card>
  );
};

export default DailyChart;
