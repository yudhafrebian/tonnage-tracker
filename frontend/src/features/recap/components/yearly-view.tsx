"use client";

import { useMemo } from "react";
import { Spinner } from "@/components/ui/spinner";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { useYearlyRecapQuery } from "../api/recap.query";
import RecapCardList from "./recap-card-list";
import { RecapTable } from "./table/data-table";
import { makeYearlyColumns } from "./table/yearly-column";
import { FINANCE_COLUMN_IDS } from "./table/money";

interface YearlyViewProps {
  year: string; // "2026"
  // Klik baris bulan -> buka bulan itu di tab Bulanan.
  onPickMonth: (month: string) => void;
}

// Tab Tahunan: 12 baris ringkasan per bulan + total tahun dari backend.
const YearlyView = ({ year, onPickMonth }: YearlyViewProps) => {
  const { dict } = useI18n();
  const { data, isPending, error } = useYearlyRecapQuery(year);
  const fmt = useFormatter();
  const yearlyColumns = useMemo(() => makeYearlyColumns(dict.recap, fmt), [dict, fmt]);

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

  return (
    <>
      {/* Bentuk data.total sama dengan total bulanan, jadi card bisa dipakai ulang. */}
      <RecapCardList data={data.total} />
      <RecapTable
        data={data.months}
        columns={yearlyColumns}
        total={data.total}
        // VIEWER: backend tidak mengirim field keuangan -> sembunyikan grup Keuangan.
        hiddenColumns={data.total.income === undefined ? FINANCE_COLUMN_IDS : []}
        onRowClick={(row) => onPickMonth(row.month)}
      />
    </>
  );
};

export default YearlyView;
