"use client";

import { cn } from "cn";
import { useFormatter, type Formatter } from "@/shared/i18n/use-formatter";

// Rupiah tanpa "Rp" per sel: judul grup sudah "Keuangan (Rp)", kolom jadi lebih ramping.
export const makeMoney = (fmt: Formatter) => (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : fmt.amount(value);

// Id kolom keuangan; disembunyikan untuk role tanpa finance:read (VIEWER).
export const FINANCE_COLUMN_IDS = [
  "finance.price",
  "finance.income",
  "finance.expense",
  "finance.profit",
];

// Laba: merah kalau negatif.
export const Profit = ({ value }: { value: number | null | undefined }) => {
  const money = makeMoney(useFormatter());
  return (
    <span className={cn(value !== null && value !== undefined && value < 0 && "text-destructive")}>
      {money(value)}
    </span>
  );
};
