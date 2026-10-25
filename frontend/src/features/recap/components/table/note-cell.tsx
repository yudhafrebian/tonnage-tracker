"use client";

import { MessageSquareTextIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Ikon kecil di tabel; isi catatan muncul saat ikon di-hover / difokus (keyboard).
// Disimpan sebagai ikon, bukan teks penuh, supaya tabel tidak melebar.
const NoteCell = ({ note }: { note: string | null | undefined }) => {
  if (!note) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={note}
            className="inline-flex text-muted-foreground hover:text-foreground"
          />
        }
      >
        <MessageSquareTextIcon className="size-4" />
      </TooltipTrigger>
      <TooltipContent className="whitespace-pre-wrap">{note}</TooltipContent>
    </Tooltip>
  );
};

export default NoteCell;
