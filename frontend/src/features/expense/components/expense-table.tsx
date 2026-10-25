"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Expense } from "../types/types";

interface ExpenseTableProps {
  items: Expense[];
  // Tidak dikirim = tanpa kolom Aksi (role tanpa expense:write).
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

// Kolom Catatan & Dicatat oleh disembunyikan di layar kecil; catatan pindah ke bawah kategori.
const ExpenseTable = ({ items, onEdit, onDelete }: ExpenseTableProps) => {
  const t = useI18n().dict.expense;
  const fmt = useFormatter();
  const canWrite = !!onEdit && !!onDelete;
  const total = items.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">{t.table.date}</TableHead>
            <TableHead>{t.table.category}</TableHead>
            <TableHead className="hidden md:table-cell">{t.table.note}</TableHead>
            <TableHead className="hidden lg:table-cell">{t.table.createdBy}</TableHead>
            <TableHead className="text-right">{t.table.amount}</TableHead>
            {canWrite && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="tabular-nums">{fmt.dayMonth(e.date)}</TableCell>
              <TableCell className="whitespace-normal">
                <Badge variant="secondary">{e.category}</Badge>
                {e.note && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground md:hidden">
                    {e.note}
                  </p>
                )}
              </TableCell>
              <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                <span title={e.note ?? undefined}>{e.note ?? "—"}</span>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {e.createdBy.name}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {fmt.rupiah(e.amount)}
              </TableCell>
              {canWrite && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button size="icon-xs" variant="ghost" aria-label={t.actions.menu}>
                          <MoreHorizontal />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={() => onEdit(e)}>
                        <Pencil />
                        {t.actions.edit}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete(e)}>
                        <Trash2 />
                        {t.actions.delete}
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
            <TableCell colSpan={2} className="font-semibold">
              {t.table.total}
            </TableCell>
            <TableCell className="hidden md:table-cell" />
            <TableCell className="hidden lg:table-cell" />
            <TableCell className="text-right font-semibold tabular-nums">
              {fmt.rupiah(total)}
            </TableCell>
            {canWrite && <TableCell />}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default ExpenseTable;
