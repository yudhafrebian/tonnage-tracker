"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { cn } from "cn";
import { ChartBarBigIcon } from "lucide-react";
import type { CategoryTotal } from "../types/types";

interface CategoryBreakdownProps {
  items: CategoryTotal[]; // yang terbesar lebih dulu (dari backend)
  total: number;
  selected: string | null;
  // Klik baris = filter tabel ke kategori itu; klik lagi = semua.
  onSelect: (category: string | null) => void;
}

// Bar horizontal per kategori. Lebar bar relatif ke kategori terbesar supaya perbedaannya terlihat,
// persentasenya tetap terhadap total bulan.
const CategoryBreakdown = ({ items, total, selected, onSelect }: CategoryBreakdownProps) => {
  const t = useI18n().dict.expense;
  const fmt = useFormatter();
  const max = items[0]?.total ?? 0;

  return (
    <Card className="h-fit">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <ChartBarBigIcon size={22} /> {t.byCategory}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex max-h-96 flex-col gap-1 overflow-y-auto">
        {items.map((item) => {
          const active = selected === item.category;
          const pct = total === 0 ? 0 : Math.round((item.total / total) * 100);
          return (
            <button
              key={item.category}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : item.category)}
              className={cn(
                "flex flex-col gap-1.5 rounded-md p-2 text-left text-sm transition-colors hover:bg-muted",
                active && "bg-muted",
                selected && !active && "opacity-50",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium">{item.category}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {fmt.rupiah(item.total)} · {pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${max === 0 ? 0 : (item.total / max) * 100}%` }}
                />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdown;
