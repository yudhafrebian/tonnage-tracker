"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RecapDay } from "../../types/types";
import type { RecapTableMeta } from "./data-table-features";
import { useI18n } from "@/shared/i18n/i18n-provider";

interface RowActionsProps {
  day: RecapDay;
  onAction: RecapTableMeta["onAction"];
}

// Tanggal kosong: tombol + (tambah rekap untuk tanggal itu).
// Tanggal terisi: menu Edit / Hapus.
const RowActions = ({ day, onAction }: RowActionsProps) => {
  const t = useI18n().dict.recap.actions;
  if (!onAction) return null;

  if (!day.recap) {
    return (
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label={t.add}
        onClick={() => onAction("create", day.date)}
      >
        <Plus />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="icon-xs" variant="ghost" aria-label={t.menu}>
            <MoreHorizontal />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={() => onAction("edit", day.date)}>
          <Pencil />
          {t.edit}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onAction("delete", day.date)}>
          <Trash2 />
          {t.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RowActions;
