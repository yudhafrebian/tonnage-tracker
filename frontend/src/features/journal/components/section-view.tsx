"use client";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { CopyIcon, PlusIcon } from "lucide-react";
import { useCopyStockMutation } from "../api/journal.query";
import { MARKETS, type JournalEntry, type JournalSection } from "../types/types";
import MarketTable, { type RowAction } from "./market-table";

interface SectionViewProps {
  date: string;
  section: JournalSection;
  entries: JournalEntry[]; // baris bagian ini saja, urut seperti laporan
  // Tidak dikirim = hanya lihat (role tanpa journal:write).
  onAdd?: () => void;
  onRowAction?: (action: RowAction, entry: JournalEntry) => void;
}

// Isi satu tab: ringkasan Ekspor/Lokal/Total, lalu tabel Ekspor dan Lokal terpisah.
const SectionView = ({ date, section, entries, onAdd, onRowAction }: SectionViewProps) => {
  const { dict } = useI18n();
  const t = dict.journal;
  const tm = dict.journalManual;
  const fmt = useFormatter();
  const copy = useCopyStockMutation();
  const canCopy = !!onAdd && section === "STOCK" && entries.length === 0;

  const byMarket = Object.fromEntries(MARKETS.map((m) => [m, entries.filter((e) => e.market === m)]));
  const kgOf = (rows: JournalEntry[]) => rows.reduce((acc, e) => acc + e.kg, 0);
  const partyLabel = section === "OUT" ? t.table.customer : t.table.supplier;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="grid flex-1 grid-cols-3 gap-2 rounded-md border p-3 text-sm sm:max-w-lg">
          {[
            [t.markets.EXPORT, kgOf(byMarket.EXPORT!)],
            [t.markets.LOCAL, kgOf(byMarket.LOCAL!)],
            [t.total, kgOf(entries)],
          ].map(([label, kg]) => (
            <div key={label as string}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular-nums">{fmt.kg(kg as number)} kg</dd>
            </div>
          ))}
        </dl>
        {onAdd && (
          <div className="flex flex-wrap gap-2">
            {canCopy && (
              <Button variant="outline" disabled={copy.isPending} onClick={() => copy.mutate(date)}>
                {copy.isPending ? <Spinner /> : <CopyIcon />}
                {copy.isPending ? tm.copying : tm.copyStock}
              </Button>
            )}
            <Button onClick={onAdd}>
              <PlusIcon />
              {tm.addRows}
            </Button>
          </div>
        )}
      </div>
      {copy.error && <FieldError>{apiErrorMessage(dict, copy.error)}</FieldError>}

      {entries.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{tm.noRows}</p>
      ) : (
        // Layar lebar: Ekspor dan Lokal berdampingan supaya mudah dibandingkan.
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {MARKETS.map((m) => (
            <MarketTable
              key={m}
              market={m}
              entries={byMarket[m]!}
              showMc={section !== "PROCESS"}
              partyLabel={partyLabel}
              onAction={onRowAction}
              allowDiscrepancy={section === "STOCK"}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionView;
