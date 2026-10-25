"use client";
import { createColumnHelper } from "@tanstack/react-table";
import { AlertTriangleIcon } from "lucide-react";
import type { RecapDay } from "@/features/recap/types/types";
import type { Dictionary } from "@/shared/i18n/types";
import type { Formatter } from "@/shared/i18n/use-formatter";
import { DataTableFeatures } from "./data-table-features";
import { makeSectionGroup } from "./section-group";
import { makeMoney, Profit } from "./money";
import RowActions from "./row-actions";
import NoteCell from "./note-cell";

const columnHelper = createColumnHelper<DataTableFeatures, RecapDay>();

// Ada rekap tapi belum ada tarif yang berlaku -> harga & pemasukan kosong, beri tanda.
const isUnpriced = (row: RecapDay) => !!row.recap && row.recap.pricePerKg == null;

const Unpriced = ({ title }: { title: string }) => (
  <span
    className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
    title={title}
  >
    <AlertTriangleIcon className="size-3.5" />—
  </span>
);

// Laba harian = pemasukan - pengeluaran (sama dengan export Excel backend).
// null kalau tidak ada rekap maupun pengeluaran, atau rekapnya belum punya tarif.
const dailyProfit = (row: RecapDay): number | null => {
  if (isUnpriced(row)) return null;
  if (!row.recap && !row.expense) return null;
  return (row.recap?.income ?? 0) - (row.expense ?? 0);
};

// Fungsi (bukan konstanta) supaya teks header & format angka ikut bahasa aktif.
// Panggil dengan useMemo di komponen: useMemo(() => makeColumns(dict.recap, fmt), [dict, fmt]).
export const makeColumns = (t: Dictionary["recap"], fmt: Formatter) => {
  // recap bisa null (tanggal belum diisi) -> sel tampil "—".
  const sectionGroup = makeSectionGroup<RecapDay>((row, section) => row.recap?.[section], t, fmt);
  const money = makeMoney(fmt);
  const unpriced = <Unpriced title={t.table.unpriced} />;

  return columnHelper.columns([
    columnHelper.accessor("date", {
      header: t.table.date,
      // "2026-10-05" -> 5
      cell: (info) => Number(info.getValue().slice(8, 10)),
      footer: t.table.total,
    }),
    sectionGroup("process"),
    sectionGroup("packing"),
    sectionGroup("stock"),
    // Hanya terlihat untuk OWNER/ADMIN (lihat FINANCE_COLUMN_IDS & hiddenColumns).
    columnHelper.group({
      id: "finance",
      header: t.table.finance,
      columns: columnHelper.columns([
        columnHelper.accessor((row) => row.recap?.pricePerKg ?? null, {
          id: "finance.price",
          header: t.table.pricePerKg,
          cell: (info) => (isUnpriced(info.row.original) ? unpriced : money(info.getValue())),
          // Harga tidak dijumlah.
          footer: "",
        }),
        columnHelper.accessor((row) => row.recap?.income ?? null, {
          id: "finance.income",
          header: t.income,
          cell: (info) => (isUnpriced(info.row.original) ? unpriced : money(info.getValue())),
          footer: ({ table }) => money(table.options.meta?.total.income),
        }),
        columnHelper.accessor((row) => row.expense ?? null, {
          id: "finance.expense",
          header: t.expense,
          // Pengeluaran bisa ada walaupun tanggal itu belum ada rekap. 0 tampil "—" agar tidak ramai.
          cell: (info) => money(info.getValue() || null),
          footer: ({ table }) => money(table.options.meta?.total.expense),
        }),
        columnHelper.accessor(dailyProfit, {
          id: "finance.profit",
          header: t.profit,
          cell: (info) => <Profit value={info.getValue()} />,
          footer: ({ table }) => <Profit value={table.options.meta?.total.profit} />,
        }),
      ]),
    }),
    // Catatan dari form (semua role boleh melihat).
    columnHelper.accessor((row) => row.recap?.note ?? null, {
      id: "note",
      header: t.table.note,
      cell: (info) => <NoteCell note={info.getValue()} />,
    }),
    // Hanya terlihat untuk role dengan recap:write (OWNER/ADMIN).
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row, table }) => (
        <RowActions day={row.original} onAction={table.options.meta?.onAction} />
      ),
    }),
  ]);
};
