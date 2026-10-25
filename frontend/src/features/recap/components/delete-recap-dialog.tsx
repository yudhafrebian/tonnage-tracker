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
import { useDeleteRecapMutation } from "../api/recap.query";

interface DeleteRecapDialogProps {
  date: string; // "2026-10-05"
  onClose: () => void;
}

// Konfirmasi hapus rekap satu tanggal (pola sama dengan dialog logout).
const DeleteRecapDialog = ({ date, onClose }: DeleteRecapDialogProps) => {
  const { dict } = useI18n();
  const t = dict.recap;
  const fmt = useFormatter();
  const { mutate, isPending, error } = useDeleteRecapMutation();

  return (
    <AlertDialog
      open
      // Esc / Batal tidak menutup dialog selama request hapus berjalan.
      onOpenChange={(open) => !open && !isPending && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{fill(t.deleteDialog.title, { date: fmt.date(date) })}</AlertDialogTitle>
          <AlertDialogDescription>{t.deleteDialog.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FieldError>{apiErrorMessage(dict, error)}</FieldError>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t.form.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => mutate(date, { onSuccess: onClose })}
          >
            {isPending && <Spinner />}
            {isPending ? t.deleteDialog.deleting : t.deleteDialog.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteRecapDialog;
