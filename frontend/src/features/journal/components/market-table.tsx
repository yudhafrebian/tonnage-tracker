"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { ClipboardListIcon, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { JournalEntry, Market } from "../types/types";

export type RowAction = "edit" | "delete" | "discrepancy";

interface MarketTableProps {
  market: Market;
  entries: JournalEntry[];
  // Proses tidak punya kolom MC (sama dengan Excel staf).
  showMc: boolean;
  // Barang keluar memakai "Pelanggan", bagian lain "Supplier".
  partyLabel: string;
  // Tidak dikirim = tanpa kolom aksi (role tanpa journal:write).
  onAction?: (action: RowAction, entry: JournalEntry) => void;
  // Menu "Catat selisih" hanya untuk baris sisa stok.
  allowDiscrepancy?: boolean;
}

// Satu tabel per pasar (Ekspor / Lokal), baris disalin apa adanya dari laporan, dengan subtotal.
const MarketTable = ({ market, entries, showMc, partyLabel, onAction, allowDiscrepancy }: MarketTableProps) => {
  const { dict } = useI18n();
  const t = dict.journal;
  const ta = dict.journalManual.actions;
  const fmt = useFormatter();
  const kg = entries.reduce((acc, e) => acc + e.kg, 0);
  const mc = entries.reduce((acc, e) => acc + (e.mc ?? 0), 0);

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge variant={market === "EXPORT" ? "default" : "secondary"}>{t.markets[market]}</Badge>
        <span className="text-sm text-muted-foreground tabular-nums">
          {entries.length > 0 ? `${fmt.kg(kg)} kg` : t.noRows}
        </span>
      </div>
      {entries.length > 0 && (
        <Table containerClassName="rounded-md border">
          <TableHeader>
            <TableRow>
              <TableHead>{partyLabel}</TableHead>
              <TableHead>{t.table.item}</TableHead>
              <TableHead>{t.table.size}</TableHead>
              {showMc && <TableHead className="text-right">{t.table.mc}</TableHead>}
              <TableHead className="text-right">{t.table.kg}</TableHead>
              {onAction && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-normal">{e.party}</TableCell>
                <TableCell className="whitespace-normal">{e.item}</TableCell>
                <TableCell className="text-muted-foreground">{e.size ?? "—"}</TableCell>
                {showMc && (
                  <TableCell className="text-right tabular-nums">{e.mc === null ? "—" : fmt.kg(e.mc)}</TableCell>
                )}
                <TableCell className="text-right font-medium tabular-nums">{fmt.kg(e.kg)}</TableCell>
                {onAction && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button size="icon-xs" variant="ghost" aria-label={ta.menu}>
                            <MoreHorizontal />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onAction("edit", e)}>
                          <Pencil />
                          {ta.edit}
                        </DropdownMenuItem>
                        {allowDiscrepancy && (
                          <DropdownMenuItem onClick={() => onAction("discrepancy", e)}>
                            <ClipboardListIcon />
                            {ta.recordDiscrepancy}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => onAction("delete", e)}>
                          <Trash2 />
                          {ta.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} className="font-semibold">
                {t.table.subtotal}
              </TableCell>
              {showMc && <TableCell className="text-right font-semibold tabular-nums">{fmt.kg(mc)}</TableCell>}
              <TableCell className="text-right font-semibold tabular-nums">{fmt.kg(kg)}</TableCell>
              {onAction && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </section>
  );
};

export default MarketTable;
