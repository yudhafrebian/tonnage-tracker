"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { cn } from "cn";
import { getDaysInMonth, parseISO } from "date-fns";
import { useJournalMonthQuery } from "../api/journal.query";

interface DayStripProps {
  date: string; // "2026-10-06"
  onPick: (date: string) => void;
}

// Deret tanggal 1..akhir bulan; tanggal yang sudah punya jurnal diberi titik.
const DayStrip = ({ date, onPick }: DayStripProps) => {
  const { dict } = useI18n();
  const t = dict.journal;
  const fmt = useFormatter();
  const month = date.slice(0, 7);
  const { data } = useJournalMonthQuery(month);
  const filled = new Map((data?.month === month ? data.days : []).map((d) => [d.date, d.sections]));
  const days = getDaysInMonth(parseISO(`${month}-01`));

  return (
    <nav aria-label={t.daysWithData} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {Array.from({ length: days }, (_, i) => {
        const d = `${month}-${String(i + 1).padStart(2, "0")}`;
        const sections = filled.get(d);
        const active = d === date;
        const button = (
          <button
            type="button"
            aria-current={active ? "date" : undefined}
            onClick={() => onPick(d)}
            className={cn(
              "flex w-9 shrink-0 flex-col items-center gap-1 rounded-md py-1.5 text-sm tabular-nums transition-colors hover:bg-muted",
              active && "bg-primary text-primary-foreground hover:bg-primary",
              !sections && !active && "text-muted-foreground",
            )}
          >
            {i + 1}
            <span
              className={cn(
                "size-1.5 rounded-full",
                sections ? (active ? "bg-primary-foreground" : "bg-primary") : "bg-transparent",
              )}
            />
          </button>
        );
        if (!sections) return <span key={d}>{button}</span>;
        return (
          <Tooltip key={d}>
            <TooltipTrigger render={button} />
            <TooltipContent>
              <p className="font-medium">{fmt.date(d)}</p>
              {(["PROCESS", "PACKING", "STOCK", "OUT"] as const)
                .filter((s) => sections[s])
                .map((s) => (
                  <p key={s} className="tabular-nums">
                    {t.tabs[s]}: {fmt.kg(sections[s]!.kg)} kg
                  </p>
                ))}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
};

export default DayStrip;
