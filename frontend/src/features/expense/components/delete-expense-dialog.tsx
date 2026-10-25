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
import { useDeleteExpenseMutation } from "../api/expense.query";
import type { Expense } from "../types/types";

interface DeleteExpenseDialogProps {
  expense: Expense;
  onClose: () => void;
}

// Konfirmasi hapus satu catatan pengeluaran (pola sama dengan DeleteRecapDialog).
const DeleteExpenseDialog = ({ expense, onClose }: DeleteExpenseDialogProps) => {
  const { dict } = useI18n();
  const t = dict.expense;
  const fmt = useFormatter();
  const { mutate, isPending, error } = useDeleteExpenseMutation();

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.deleteDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {fill(t.deleteDialog.description, {
              category: expense.category,
              amount: fmt.rupiah(expense.amount),
              date: fmt.date(expense.date),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FieldError>{apiErrorMessage(dict, error)}</FieldError>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t.form.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => mutate(expense.id, { onSuccess: onClose })}
          >
            {isPending && <Spinner />}
            {isPending ? t.deleteDialog.deleting : t.deleteDialog.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteExpenseDialog;
