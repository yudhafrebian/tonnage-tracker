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
import { useDeletePriceRateMutation } from "../api/price-rate.query";
import type { PriceRate } from "../types/types";

interface DeletePriceRateDialogProps {
  rate: PriceRate;
  onClose: () => void;
}

const DeletePriceRateDialog = ({ rate, onClose }: DeletePriceRateDialogProps) => {
  const { dict } = useI18n();
  const t = dict.priceRate;
  const fmt = useFormatter();
  const { mutate, isPending, error } = useDeletePriceRateMutation();

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {fill(t.deleteDialog.title, { date: fmt.date(rate.effectiveFrom) })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t.deleteDialog.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FieldError>{apiErrorMessage(dict, error)}</FieldError>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t.form.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => mutate(rate.id, { onSuccess: onClose })}
          >
            {isPending && <Spinner />}
            {isPending ? t.deleteDialog.deleting : t.deleteDialog.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletePriceRateDialog;
