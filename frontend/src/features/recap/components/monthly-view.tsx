"use client";

import { useMemo } from "react";
import { Spinner } from "@/components/ui/spinner";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { useMonthlyRecapQuery } from "../api/recap.query";
import AlertSection from "./alert-section";
import RecapCardList from "./recap-card-list";
import { makeColumns } from "./table/column";
import { RecapTable } from "./table/data-table";
import { FINANCE_COLUMN_IDS } from "./table/money";
import type { RecapTableMeta } from "./table/data-table-features";
import { usePermission } from "@/features/auth";

interface MonthlyViewProps {
  month: string;
  // Kolom Aksi -> buka dialog tambah/edit/hapus untuk tanggal itu.
  onAction: NonNullable<RecapTableMeta["onAction"]>;
}

// Tab Bulanan: query bulanan hanya berjalan saat tab ini tampil.
const MonthlyView = ({ month, onAction }: MonthlyViewProps) => {
  const { dict } = useI18n();
  const { data, isPending, error } = useMonthlyRecapQuery(month);
  const { allowed: canWrite } = usePermission("recap:write");
  const fmt = useFormatter();
  // Dibuat ulang hanya saat bahasa berganti, bukan setiap render.
  const columns = useMemo(() => makeColumns(dict.recap, fmt), [dict, fmt]);

  if (isPending) {
    return (
      <div className="flex justify-center p-6">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return <p className="p-6 text-destructive">{apiErrorMessage(dict, error)}</p>;
  }

  // Backend tidak mengirim field keuangan untuk VIEWER -> sembunyikan grup Keuangan.
  // Kolom Aksi hanya untuk role yang boleh menulis rekap.
  const hiddenColumns = [
    ...(data.total.income === undefined ? FINANCE_COLUMN_IDS : []),
    ...(canWrite ? [] : ["actions"]),
  ];

  return (
    <>
      {data.missingDates.length > 0 && (
        <AlertSection dates={data.missingDates} title={dict.recap.missingDates} />
      )}
      {/* Hanya dikirim untuk OWNER/ADMIN: rekap ada, tapi belum ada tarif -> pemasukan belum terhitung. */}
      {data.unpricedDates && data.unpricedDates.length > 0 && (
        <AlertSection dates={data.unpricedDates} title={dict.recap.unpricedDates} />
      )}
      <RecapCardList data={data.total} />
      <RecapTable
        data={data.days}
        columns={columns}
        total={data.total}
        hiddenColumns={hiddenColumns}
        onAction={onAction}
      />
    </>
  );
};

export default MonthlyView;
