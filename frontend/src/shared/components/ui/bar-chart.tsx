"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "cn";
import type { ReactNode } from "react";

export type BarSegment = { value: number; className: string };

export type BarDatum = {
  key: string;
  label: string; // label sumbu X
  // Urutan dari bawah ke atas. null = tidak ada data (kolom kosong, bukan 0).
  segments: BarSegment[] | null;
  tooltip: ReactNode;
  ariaLabel: string;
  active?: boolean;
};

interface BarChartProps {
  data: BarDatum[];
  formatTick: (n: number) => string;
  onBarClick?: (key: string) => void;
  // Tampilkan label sumbu X setiap n kolom (grafik harian: 31 kolom terlalu rapat).
  labelEvery?: number;
  className?: string;
}

// Langkah sumbu Y yang "bulat": 1, 2, 2.5, 5 × 10^n.
const niceStep = (range: number, count: number) => {
  if (range <= 0) return 1;
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
};

// Grafik batang (bertumpuk) tanpa library: kolom CSS, gridline 1px, sudut 4px di ujung data,
// celah 2px antar segmen. Nilai negatif didukung untuk batang satu segmen (mis. laba rugi).
export const BarChart = ({
  data,
  formatTick,
  onBarClick,
  labelEvery = 1,
  className,
}: BarChartProps) => {
  const sums = data.map((d) => (d.segments ?? []).reduce((acc, s) => acc + s.value, 0));
  const step = niceStep(Math.max(0, ...sums) - Math.min(0, ...sums), 4);
  const top = Math.max(step, Math.ceil(Math.max(0, ...sums) / step) * step);
  const bottom = Math.floor(Math.min(0, ...sums) / step) * step;
  const range = top - bottom;
  const pct = (v: number) => ((v - bottom) / range) * 100; // posisi dari bawah, dalam persen
  // Hitung lewat indeks, bukan v += step, supaya tidak menumpuk galat floating point.
  const ticks = Array.from({ length: Math.round(range / step) + 1 }, (_, k) => bottom + k * step);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex min-h-0 flex-1 gap-2">
        {/* Sumbu Y */}
        <div className="relative w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {ticks.map((v) => (
            <span
              key={v}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${pct(v)}%` }}
            >
              {formatTick(v)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((v) => (
            <div
              key={v}
              className={cn("absolute inset-x-0 h-px", v === 0 ? "bg-border" : "bg-border/50")}
              style={{ bottom: `${pct(v)}%` }}
            />
          ))}
          <div className="absolute inset-0 flex">
            {data.map((d, i) => {
              const sum = sums[i]!;
              const negative = sum < 0;
              const height = (Math.abs(sum) / range) * 100;
              return (
                <Tooltip key={d.key}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        aria-label={d.ariaLabel}
                        onClick={onBarClick ? () => onBarClick(d.key) : undefined}
                        className={cn(
                          // Area hover = seluruh tinggi kolom, lebih besar dari batangnya.
                          "group relative flex-1 rounded-sm outline-none hover:bg-muted/60 focus-visible:bg-muted/60",
                          d.active && "bg-muted/60",
                          !onBarClick && "cursor-default",
                        )}
                      />
                    }
                  >
                    {d.segments && sum !== 0 && (
                      <span
                        className={cn(
                          "absolute left-1/2 flex w-[70%] max-w-6 -translate-x-1/2 gap-[2px] overflow-hidden",
                          negative ? "flex-col rounded-b-[4px]" : "flex-col-reverse rounded-t-[4px]",
                        )}
                        style={
                          negative
                            ? { top: `${100 - pct(0)}%`, height: `${height}%` }
                            : { bottom: `${pct(0)}%`, height: `${height}%` }
                        }
                      >
                        {d.segments
                          .filter((s) => s.value !== 0)
                          .map((s, j) => (
                            <span
                              key={j}
                              className={cn("block min-h-px w-full", s.className)}
                              style={{ flexGrow: Math.abs(s.value), flexBasis: 0 }}
                            />
                          ))}
                      </span>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>{d.tooltip}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
      {/* Sumbu X */}
      <div className="flex gap-2">
        <div className="w-12 shrink-0" />
        <div className="flex flex-1">
          {data.map((d, i) => (
            // Label boleh lebih lebar dari kolomnya (grafik harian di HP): diletakkan di tengah kolom, tidak dipotong.
            <span key={d.key} className="relative h-4 flex-1">
              {i % labelEvery === 0 && (
                <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  {d.label}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Legenda: penanda berwarna di samping teks (teks tetap warna teks biasa).
export const ChartLegend = ({ items }: { items: { label: string; className: string }[] }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
    {items.map((item) => (
      <span key={item.label} className="flex items-center gap-1.5">
        <span className={cn("size-2.5 rounded-[3px]", item.className)} />
        {item.label}
      </span>
    ))}
  </div>
);
