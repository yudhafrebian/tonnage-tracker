"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { cn } from "cn";
import type { Section } from "../types/types";
import { ReactNode } from "react";

// Dua jenis card dengan props masing-masing, supaya TypeScript menolak
// kalau prop yang dibutuhkan tidak dikirim (mis. card uang tanpa nilai).

interface KgCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  value: Section | null;
}

export const KgCard = ({ title, description, value, icon }: KgCardProps) => {
  const format = useFormatter();
  const parts = useI18n().dict.recap.parts;
  const kg = (n: number | undefined) =>
    n === undefined ? "—" : `${format.kg(n)} kg`;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          {icon} {title}{" "}
          {description ? (
            <span className="text-sm text-muted-foreground">
              ({description})
            </span>
          ) : (
            ""
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-2xl font-semibold">{kg(value?.total)}</p>
        {/* Urutan sama dengan tabel: Total, Ekspor, Lokal */}
        <div className="flex justify-between gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">{parts.export}</p>
            <p className="font-medium">{kg(value?.export)}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">{parts.local}</p>
            <p className="font-medium">{kg(value?.local)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface MoneyCardProps {
  title: string;
  value: number;
  icon?: ReactNode;
  rows?: { label: string; value: number }[];
  // Laba: hijau kalau positif, merah kalau negatif.
  signed?: boolean;
}

export const MoneyCard = ({
  title,
  value,
  rows,
  signed,
  icon,
}: MoneyCardProps) => {
  const format = useFormatter();

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          {icon} {title}{" "}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p
          className={cn(
            "text-2xl font-semibold",
            signed && value > 0 && "text-emerald-600 dark:text-emerald-400",
            signed && value < 0 && "text-destructive",
          )}
        >
          {format.rupiah(value)}
        </p>
        {rows?.map((row) => (
          <div key={row.label} className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium">{format.rupiah(row.value)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
