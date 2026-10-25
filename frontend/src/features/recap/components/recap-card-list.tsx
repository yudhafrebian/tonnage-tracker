"use client";

import { cn } from "cn";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { format as fill } from "@/shared/i18n/format";
import type { MonthlyRecap } from "../types/types";
import { KgCard, MoneyCard } from "./recap-card";
import {
  ArchiveIcon,
  CreditCardIcon,
  PackageIcon,
  TrendingUpIcon,
  UserCog,
} from "lucide-react";

interface RecapCardListProps {
  data: MonthlyRecap["total"];
}

const RecapCardList = ({ data }: RecapCardListProps) => {
  const format = useFormatter();
  const t = useI18n().dict.recap;
  // Backend tidak mengirim income/expense/profit untuk VIEWER (tanpa finance:read),
  // jadi card uang disembunyikan, bukan ditampilkan "Rp 0".
  const hasFinance = data.income !== undefined;

  // Sisa = posisi stok di tanggal terakhir yang diisi, bukan jumlahan: tampilkan tanggalnya.
  const stockDescription = data.stockDate
    ? fill(t.stockAsOf, { date: format.dayMonth(data.stockDate) })
    : t.noData;

  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        hasFinance ? "lg:grid-cols-3 2xl:grid-cols-5" : "lg:grid-cols-3",
      )}
    >
      <KgCard
        icon={<UserCog size={22} />}
        title={t.sections.process}
        value={data.process}
      />
      <KgCard
        icon={<PackageIcon size={22} />}
        title={t.sections.packing}
        value={data.packing}
      />
      <KgCard
        icon={<ArchiveIcon size={22} />}
        title={t.sections.stock}
        description={stockDescription}
        value={data.stock}
      />
      {hasFinance && (
        <>
          <MoneyCard
            icon={<CreditCardIcon size={22} />}
            title={t.income}
            value={data.income ?? 0}
            rows={[{ label: t.expense, value: data.expense ?? 0 }]}
          />
          <MoneyCard
            icon={<TrendingUpIcon size={22} />}
            title={t.profit}
            value={data.profit ?? 0}
            signed
          />
        </>
      )}
    </div>
  );
};

export default RecapCardList;
