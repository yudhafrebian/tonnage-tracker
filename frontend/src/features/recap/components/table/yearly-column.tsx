"use client";
import { createColumnHelper } from "@tanstack/react-table";
import { AlertTriangleIcon } from "lucide-react";
import type { MonthSummary } from "@/features/recap/types/types";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { intlTag } from "@/shared/i18n/config";
import type { Dictionary } from "@/shared/i18n/types";
import type { Formatter } from "@/shared/i18n/use-formatter";
import { format as fill } from "@/shared/i18n/format";
import { DataTableFeatures } from "./data-table-features";
import { makeSectionGroup } from "./section-group";
import { makeMoney, Profit } from "./money";

const columnHelper = createColumnHelper<DataTableFeatures, MonthSummary>();

// Komponen (bukan fungsi biasa) supaya boleh memakai hook bahasa.
// "2026-10" -> id: "Oktober", en: "October", zh: "十月"
const MonthName = ({ month }: { month: string }) => {
  const { lang } = useI18n();
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(intlTag[lang], { month: "long" }).format(new Date(y!, m! - 1, 1));
};

// Fungsi (bukan konstanta) supaya teks header & format angka ikut bahasa aktif.
export const makeYearlyColumns = (t: Dictionary["recap"], fmt: Formatter) => {
  // stock null = bulan tanpa rekap -> "—".
  const sectionGroup = makeSectionGroup<MonthSummary>((row, section) => row[section], t, fmt);
  const money = makeMoney(fmt);

  return columnHelper.columns([
    columnHelper.accessor("month", {
      header: t.table.month,
      cell: (info) => <MonthName month={info.getValue()} />,
      footer: t.table.total,
    }),
    sectionGroup("process"),
    sectionGroup("packing"),
    sectionGroup("stock"),
    columnHelper.accessor("recordedDays", {
      header: t.table.recordedDays,
      cell: (info) => {
        const missing = info.row.original.missingDays;
        return (
          <span className="inline-flex items-center gap-1">
            {info.getValue()}
            {missing > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400"
                title={fill(t.table.missedDays, { count: missing })}
              >
                <AlertTriangleIcon className="size-3.5" />
                {missing}
              </span>
            )}
          </span>
        );
      },
      footer: ({ table }) => table.options.meta?.total.recordedDays ?? "—",
    }),
    // Hanya terlihat untuk OWNER/ADMIN. Tanpa Harga/kg: satu bulan bisa punya beberapa tarif.
    columnHelper.group({
      id: "finance",
      header: t.table.finance,
      columns: columnHelper.columns([
        columnHelper.accessor((row) => row.income ?? null, {
          id: "finance.income",
          header: t.income,
          cell: (info) => money(info.getValue()),
          footer: ({ table }) => money(table.options.meta?.total.income),
        }),
        columnHelper.accessor((row) => row.expense ?? null, {
          id: "finance.expense",
          header: t.expense,
          cell: (info) => money(info.getValue()),
          footer: ({ table }) => money(table.options.meta?.total.expense),
        }),
        columnHelper.accessor((row) => row.profit ?? null, {
          id: "finance.profit",
          header: t.profit,
          cell: (info) => <Profit value={info.getValue()} />,
          footer: ({ table }) => <Profit value={table.options.meta?.total.profit} />,
        }),
      ]),
    }),
  ]);
};
