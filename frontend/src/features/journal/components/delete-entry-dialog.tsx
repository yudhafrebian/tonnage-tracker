"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { useDeleteEntryMutation } from "../api/journal.query";
import type { JournalEntry } from "../types/types";

interface DeleteEntryDialogProps {
  entry: JournalEntry;
  date: string;
  onClose: () => void;
}

const DeleteEntryDialog = ({ entry, date, onClose }: DeleteEntryDialogProps) => {
  const { dict } = useI18n();
  const t = dict.journalManual.deleteDialog;
  const fmt = useFormatter();
  const { mutate, isPending, error } = useDeleteEntryMutation();

  return (
    <AlertDialog open onOpenChange={(o) => !o && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {fill(t.description, {
              party: entry.party,
              item: entry.item,
              size: entry.size ?? "",
              kg: fmt.kg(entry.kg),
              date: fmt.date(date),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FieldError>{apiErrorMessage(dict, error)}</FieldError>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{dict.journalManual.form.cancel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={() => mutate(entry.id, { onSuccess: onClose })}>
            {isPending && <Spinner />}
            {isPending ? t.deleting : t.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEntryDialog;
