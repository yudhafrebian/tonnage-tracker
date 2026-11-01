"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/features/auth";
import { DiscrepancyFormDialog, useDiscrepanciesQuery } from "@/features/discrepancy";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { addDays, format, parseISO } from "date-fns";
import { AlertTriangleIcon, ChevronLeft, ChevronRight, RotateCw, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useJournalDayQuery, useLatestJournalDateQuery } from "../api/journal.query";
import { JOURNAL_SECTIONS, type JournalEntry, type JournalSection } from "../types/types";
import DayStrip from "./day-strip";
import DeleteEntryDialog from "./delete-entry-dialog";
import EditEntryDialog from "./edit-entry-dialog";
import EntryFormDialog from "./entry-form-dialog";
import ImportJournalDialog from "./import-journal-dialog";
import type { RowAction } from "./market-table";
import SectionView from "./section-view";

const shiftDay = (date: string, n: number) => format(addDays(parseISO(date), n), "yyyy-MM-dd");

type DialogState =
  | { type: null }
  | { type: "import" }
  | { type: "add"; section: JournalSection }
  | { type: RowAction; entry: JournalEntry };

const JournalPage = () => {
  const { dict } = useI18n();
  const t = dict.journal;
  const fmt = useFormatter();
  const { allowed: canWrite } = usePermission("journal:write");
  const latest = useLatestJournalDateQuery();
  const openDiscrepancies = useDiscrepanciesQuery("OPEN").data?.openCount ?? 0;
  // Sebelum user memilih: buka tanggal jurnal terakhir, atau hari ini kalau belum ada jurnal.
  const [picked, setPicked] = useState<string | null>(null);
  const [section, setSection] = useState<JournalSection>("PROCESS");
  const [dialog, setDialog] = useState<DialogState>({ type: null });
  const close = () => setDialog({ type: null });

  if (latest.isPending) {
    return <Skeleton className="h-96" />;
  }
  const date = picked ?? latest.data ?? format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{t.title}</h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {fmt.date(date)}
              {openDiscrepancies > 0 && (
                <Link href="/dashboard/discrepancies">
                  <Badge variant="outline" className="border-amber-500 text-amber-700 hover:bg-muted dark:text-amber-400">
                    <AlertTriangleIcon />
                    {fill(dict.journalManual.openDiscrepancies, { count: openDiscrepancies })}
                  </Badge>
                </Link>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="icon" variant="outline" aria-label={t.previousDay} onClick={() => setPicked(shiftDay(date, -1))}>
              <ChevronLeft />
            </Button>
            <Input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setPicked(e.target.value)}
              className="w-40"
              aria-label={dict.recap.table.date}
            />
            <Button size="icon" variant="outline" aria-label={t.nextDay} onClick={() => setPicked(shiftDay(date, 1))}>
              <ChevronRight />
            </Button>
            {canWrite && (
              <Button onClick={() => setDialog({ type: "import" })}>
                <Upload />
                {t.import}
              </Button>
            )}
          </div>
        </div>
        <DayStrip date={date} onPick={setPicked} />
      </div>

      <DayContent
        date={date}
        section={section}
        onSectionChange={setSection}
        onAdd={canWrite ? (s) => setDialog({ type: "add", section: s }) : undefined}
        onRowAction={canWrite ? (type, entry) => setDialog({ type, entry }) : undefined}
      />

      {dialog.type === "import" && <ImportJournalDialog onClose={close} onImported={setPicked} />}
      {dialog.type === "add" && <EntryFormDialog date={date} section={dialog.section} onClose={close} />}
      {dialog.type === "edit" && <EditEntryDialog entry={dialog.entry} onClose={close} />}
      {dialog.type === "delete" && <DeleteEntryDialog entry={dialog.entry} date={date} onClose={close} />}
      {dialog.type === "discrepancy" && (
        <DiscrepancyFormDialog
          prefill={{ date, party: dialog.entry.party, item: dialog.entry.item, size: dialog.entry.size }}
          onClose={close}
        />
      )}
    </div>
  );
};

const DayContent = ({
  date,
  section,
  onSectionChange,
  onAdd,
  onRowAction,
}: {
  date: string;
  section: JournalSection;
  onSectionChange: (s: JournalSection) => void;
  onAdd?: (section: JournalSection) => void;
  onRowAction?: (action: RowAction, entry: JournalEntry) => void;
}) => {
  const { dict } = useI18n();
  const t = dict.journal;
  const { data, isPending, error, refetch, isRefetching } = useJournalDayQuery(date);

  if (isPending) return <Skeleton className="h-80" />;
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border p-10 text-center">
        <p className="text-destructive">{apiErrorMessage(dict, error)}</p>
        <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
          <RotateCw className={isRefetching ? "animate-spin" : undefined} />
          {dict.expense.retry}
        </Button>
      </div>
    );
  }

  const bySection = (s: JournalSection) => data.entries.filter((e) => e.section === s);

  return (
    <div className="flex flex-col gap-3">
      {/* Hari kosong: tab tetap tampil supaya bisa diisi manual; import lewat tombol di atas. */}
      {data.entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t.empty}. {onAdd && t.emptyHint}
        </p>
      )}
      <Tabs value={section} onValueChange={(v) => onSectionChange(v as JournalSection)}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          {JOURNAL_SECTIONS.map((s) => (
            <TabsTrigger key={s} value={s} className="gap-1.5">
              {t.tabs[s]}
              <span className="text-xs text-muted-foreground tabular-nums">{bySection(s).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {JOURNAL_SECTIONS.map((s) => (
          <TabsContent key={s} value={s} className="pt-2">
            <SectionView
              date={date}
              section={s}
              entries={bySection(s)}
              onAdd={onAdd && (() => onAdd(s))}
              onRowAction={onRowAction}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default JournalPage;
