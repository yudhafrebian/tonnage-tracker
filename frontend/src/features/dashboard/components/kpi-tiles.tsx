"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { cn } from "cn";
import {
  ArchiveIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CreditCardIcon,
  PackageIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserCog,
} from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardSummary } from "../types/types";

// Persen perubahan vs bulan lalu. Warna = arah × apakah naik itu baik
// (pengeluaran naik = merah). Selalu dengan ikon panah, bukan warna saja.
const Delta = ({ value, upIsGood = true }: { value: number | null | undefined; upIsGood?: boolean }) => {
  const { dict } = useI18n();
  const fmt = useFormatter();
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground">{dict.dashboard.noChange}</span>;
  }
  const good = value === 0 ? null : value > 0 === upIsGood;
  const Icon = value >= 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        good === true && "text-emerald-600 dark:text-emerald-400",
        good === false && "text-destructive",
        good === null && "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {fmt.percent(Math.abs(value))}%
      <span className="font-normal text-muted-foreground">{dict.dashboard.vsPrevious}</span>
    </span>
  );
};

const Tile = ({
  icon,
  title,
  value,
  valueClassName,
  delta,
  footer,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  valueClassName?: string;
  delta?: ReactNode;
  footer?: string;
}) => (
  <Card>
    <CardHeader className="border-b">
      <CardTitle className="flex items-center gap-2">
        {icon} {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-1">
      <p className={cn("truncate text-2xl font-semibold tabular-nums", valueClassName)}>{value}</p>
      {delta}
      {footer && <p className="text-sm text-muted-foreground">{footer}</p>}
    </CardContent>
  </Card>
);

const KpiTiles = ({ data }: { data: DashboardSummary }) => {
  const { dict } = useI18n();
  const t = dict.dashboard;
  const sections = dict.recap.sections;
  const fmt = useFormatter();
  const { current, change, exportShare } = data;
  // Backend tidak mengirim field keuangan untuk VIEWER.
  const hasFinance = current.income !== undefined;

  const kg = (n: number | undefined) => (n === undefined ? "—" : `${fmt.kg(n)} ${t.kgUnit}`);
  const share = (pct: number | null) =>
    pct === null ? undefined : fill(t.exportShare, { pct: fmt.percent(pct) });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Tile
        icon={<UserCog size={22} />}
        title={sections.process}
        value={kg(current.process.total)}
        delta={<Delta value={change.process} />}
        footer={[
          share(exportShare.process),
          data.averageProcessPerDay !== null &&
            fill(t.avgPerDay, { value: fmt.kg(data.averageProcessPerDay) }),
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <Tile
        icon={<PackageIcon size={22} />}
        title={sections.packing}
        value={kg(current.packing.total)}
        delta={<Delta value={change.packing} />}
        footer={share(exportShare.packing)}
      />
      {/* Sisa = posisi di tanggal terakhir yang diisi, jadi tanpa perbandingan. */}
      <Tile
        icon={<ArchiveIcon size={22} />}
        title={sections.stock}
        value={kg(current.stock?.total)}
        footer={[
          current.stockDate && fill(t.stockAsOf, { date: fmt.dayMonth(current.stockDate) }),
          share(exportShare.stock),
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      {hasFinance && (
        <>
          <Tile
            icon={<CreditCardIcon size={22} />}
            title={dict.recap.income}
            value={fmt.rupiah(current.income ?? 0)}
            delta={<Delta value={change.income} />}
          />
          <Tile
            icon={<TrendingDownIcon size={22} />}
            title={dict.recap.expense}
            value={fmt.rupiah(current.expense ?? 0)}
            delta={<Delta value={change.expense} upIsGood={false} />}
          />
          <Tile
            icon={<TrendingUpIcon size={22} />}
            title={dict.recap.profit}
            value={fmt.rupiah(current.profit ?? 0)}
            valueClassName={cn(
              (current.profit ?? 0) > 0 && "text-emerald-600 dark:text-emerald-400",
              (current.profit ?? 0) < 0 && "text-destructive",
            )}
            delta={<Delta value={change.profit} />}
          />
        </>
      )}
    </div>
  );
};

export default KpiTiles;
