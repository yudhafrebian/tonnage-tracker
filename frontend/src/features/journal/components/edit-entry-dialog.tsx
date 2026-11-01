"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useUpdateEntryMutation } from "../api/journal.query";
import { makeEntrySchemas, type EditEntryFormOutput, type EditEntryFormValues } from "../schemas";
import { MARKETS, type JournalEntry } from "../types/types";

interface EditEntryDialogProps {
  entry: JournalEntry;
  onClose: () => void;
}

// Edit satu baris jurnal (hasil import maupun manual), termasuk label Ekspor/Lokal-nya.
const EditEntryDialog = ({ entry, onClose }: EditEntryDialogProps) => {
  const { dict } = useI18n();
  const t = dict.journalManual.form;
  const tj = dict.journal;
  const schema = useMemo(() => makeEntrySchemas(dict.journalManual.form).edit, [dict]);
  const hasMc = entry.section !== "PROCESS";

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditEntryFormValues, unknown, EditEntryFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      party: entry.party,
      market: entry.market,
      item: entry.item,
      size: entry.size ?? "",
      mc: entry.mc ?? Number.NaN,
      kg: entry.kg,
    },
  });
  const { mutate, isPending } = useUpdateEntryMutation();
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = (v: EditEntryFormOutput) => {
    setServerError(null);
    mutate(
      {
        id: entry.id,
        payload: { party: v.party, market: v.market, item: v.item, size: v.size || null, mc: hasMc ? v.mc : null, kg: v.kg },
      },
      { onSuccess: onClose, onError: (err) => setServerError(apiErrorMessage(dict, err)) },
    );
  };

  const numberField = (name: "mc" | "kg", label: string) => (
    <Field>
      <FieldLabel htmlFor={`edit-${name}`}>{label}</FieldLabel>
      <Input
        id={`edit-${name}`}
        type="number"
        step="0.01"
        className="text-right tabular-nums"
        {...register(name, { valueAsNumber: true })}
      />
      <FieldError>{errors[name]?.message}</FieldError>
    </Field>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.editTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && <FieldError>{serverError}</FieldError>}
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="edit-party">{entry.section === "OUT" ? tj.table.customer : tj.table.supplier}</FieldLabel>
              <Input id="edit-party" autoComplete="off" {...register("party")} />
              <FieldError>{errors.party?.message}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-item">{tj.table.item}</FieldLabel>
                <Input id="edit-item" autoComplete="off" {...register("item")} />
                <FieldError>{errors.item?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-size">{tj.table.size}</FieldLabel>
                <Input id="edit-size" autoComplete="off" {...register("size")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {hasMc && numberField("mc", tj.table.mc)}
              {numberField("kg", tj.table.kg)}
            </div>
            <Field>
              <FieldLabel>{t.market}</FieldLabel>
              <Controller
                control={control}
                name="market"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                    {[...MARKETS].reverse().map((m) => (
                      <label key={m} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={m} />
                        {tj.markets[m]}
                      </label>
                    ))}
                  </RadioGroup>
                )}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>{t.cancel}</DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner />}
              {isPending ? t.saving : t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEntryDialog;
