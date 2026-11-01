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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { useState } from "react";
import { useDeleteDiscrepancyMutation, useUpdateDiscrepancyMutation } from "../api/discrepancy.query";
import type { Discrepancy } from "../types/types";

export const goodsLabel = (d: Pick<Discrepancy, "party" | "item" | "size">) =>
  [d.party, d.item, d.size].filter(Boolean).join(" · ");

// Tandai selesai beserta keterangan penyelesaiannya.
export const ResolveDiscrepancyDialog = ({ discrepancy, onClose }: { discrepancy: Discrepancy; onClose: () => void }) => {
  const { dict } = useI18n();
  const t = dict.discrepancy;
  const [resolution, setResolution] = useState("");
  const { mutate, isPending, error } = useUpdateDiscrepancyMutation();

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.resolveDialog.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{goodsLabel(discrepancy)}</p>
        <Field>
          <FieldLabel htmlFor="resolution">{t.resolveDialog.resolution}</FieldLabel>
          <Textarea
            id="resolution"
            rows={3}
            maxLength={500}
            placeholder={t.resolveDialog.placeholder}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
        </Field>
        {error && <FieldError>{apiErrorMessage(dict, error)}</FieldError>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>{t.form.cancel}</DialogClose>
          <Button
            disabled={isPending}
            onClick={() =>
              mutate(
                { id: discrepancy.id, payload: { status: "RESOLVED", resolution: resolution.trim() || null } },
                { onSuccess: onClose },
              )
            }
          >
            {isPending && <Spinner />}
            {t.resolveDialog.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const DeleteDiscrepancyDialog = ({ discrepancy, onClose }: { discrepancy: Discrepancy; onClose: () => void }) => {
  const { dict } = useI18n();
  const t = dict.discrepancy.deleteDialog;
  const fmt = useFormatter();
  const { mutate, isPending, error } = useDeleteDiscrepancyMutation();

  return (
    <AlertDialog open onOpenChange={(o) => !o && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {fill(t.description, { goods: goodsLabel(discrepancy), date: fmt.date(discrepancy.date) })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FieldError>{apiErrorMessage(dict, error)}</FieldError>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{dict.discrepancy.form.cancel}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={() => mutate(discrepancy.id, { onSuccess: onClose })}>
            {isPending && <Spinner />}
            {isPending ? t.deleting : t.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
