"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { getDaysInMonth, parse } from "date-fns";
import { CalendarDaysIcon, TagIcon, WalletIcon } from "lucide-react";
import type { ReactNode } from "react";
import { currentMonth } from "@/features/recap/lib/month";
import type { MonthlyExpense } from "../types/types";

const StatCard = ({
  icon,
  title,
  value,
  description,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description?: string;
}) => (
  <Card>
    <CardHeader className="border-b">
      <CardTitle className="flex items-center gap-2">
        {icon} {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-1">
      <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

// Jumlah hari yang sudah berjalan di bulan itu: bulan lalu = penuh, bulan ini = sampai hari ini,
// bulan depan = 0 (rata-rata tidak ditampilkan).
const elapsedDays = (month: string) => {
  const now = currentMonth();
  if (month > now) return 0;
  if (month < now) return getDaysInMonth(parse(month, "yyyy-MM", new Date()));
  return new Date().getDate();
};

const ExpenseSummary = ({ data }: { data: MonthlyExpense }) => {
  const { dict } = useI18n();
  const t = dict.expense;
  const fmt = useFormatter();

  const days = elapsedDays(data.month);
  const largest = data.byCategory[0];
  const share = (n: number) => (data.total === 0 ? 0 : Math.round((n / data.total) * 100));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={<WalletIcon size={22} />}
        title={t.total}
        value={fmt.rupiah(data.total)}
        description={fill(t.entries, { count: data.items.length })}
      />
      <StatCard
        icon={<CalendarDaysIcon size={22} />}
        title={t.averagePerDay}
        value={days > 0 ? fmt.rupiah(Math.round(data.total / days)) : "—"}
      />
      <StatCard
        icon={<TagIcon size={22} />}
        title={t.largest}
        value={largest ? largest.category : "—"}
        description={
          largest ? `${fmt.rupiah(largest.total)} · ${share(largest.total)}%` : undefined
        }
      />
    </div>
  );
};

export default ExpenseSummary;
