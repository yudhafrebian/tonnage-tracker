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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useCreateDiscrepancyMutation, useUpdateDiscrepancyMutation } from "../api/discrepancy.query";
import { makeDiscrepancySchema, type DiscrepancyFormOutput, type DiscrepancyFormValues } from "../schemas";
import { CAUSES, type Discrepancy, type DiscrepancyPrefill } from "../types/types";

interface DiscrepancyFormDialogProps {
  onClose: () => void;
  // Diisi = mode Edit.
  discrepancy?: Discrepancy;
  // Dari baris sisa stok di jurnal: tanggal & barang langsung terisi.
  prefill?: DiscrepancyPrefill;
}

// Catatan selisih diketik manual (barang teks bebas). Hanya catatan: tidak mengubah angka jurnal.
const DiscrepancyFormDialog = ({ onClose, discrepancy, prefill }: DiscrepancyFormDialogProps) => {
  const { dict } = useI18n();
  const t = dict.discrepancy.form;
  const causes = dict.discrepancy.causes;
  const schema = useMemo(() => makeDiscrepancySchema(dict.discrepancy.form), [dict]);
  const src = discrepancy ?? prefill;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DiscrepancyFormValues, unknown, DiscrepancyFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: src?.date ?? format(new Date(), "yyyy-MM-dd"),
      party: src?.party ?? "",
      item: src?.item ?? "",
      size: src?.size ?? "",
      mcDiff: discrepancy?.mcDiff ?? Number.NaN,
      kgDiff: discrepancy?.kgDiff ?? Number.NaN,
      cause: discrepancy?.cause ?? "MISCOUNT",
      note: discrepancy?.note ?? "",
    },
  });
  const create = useCreateDiscrepancyMutation();
  const update = useUpdateDiscrepancyMutation();
  const isPending = create.isPending || update.isPending;
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = (v: DiscrepancyFormOutput) => {
    setServerError(null);
    const payload = { ...v, size: v.size || null, note: v.note || null };
    const callbacks = { onSuccess: onClose, onError: (err: Error) => setServerError(apiErrorMessage(dict, err)) };
    if (discrepancy) update.mutate({ id: discrepancy.id, payload }, callbacks);
    else create.mutate(payload, callbacks);
  };

  const text = (name: "party" | "item" | "size", label: string) => (
    <Field>
      <FieldLabel htmlFor={`disc-${name}`}>{label}</FieldLabel>
      <Input id={`disc-${name}`} autoComplete="off" {...register(name)} />
      <FieldError>{errors[name]?.message}</FieldError>
    </Field>
  );

  const number = (name: "mcDiff" | "kgDiff", label: string) => (
    <Field>
      <FieldLabel htmlFor={`disc-${name}`}>{label}</FieldLabel>
      <Input
        id={`disc-${name}`}
        type="number"
        step="0.01"
        placeholder="+ / −"
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
          <DialogTitle>{discrepancy ? t.editTitle : t.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && <FieldError>{serverError}</FieldError>}
          <FieldGroup className="max-h-[65vh] gap-4 overflow-y-auto pr-1">
            <Field>
              <FieldLabel htmlFor="disc-date">{t.date}</FieldLabel>
              <Input id="disc-date" type="date" {...register("date")} />
              <FieldError>{errors.date?.message}</FieldError>
            </Field>
            {text("party", t.party)}
            <div className="grid gap-4 sm:grid-cols-2">
              {text("item", t.item)}
              {text("size", t.size)}
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {number("mcDiff", t.mcDiff)}
                {number("kgDiff", t.kgDiff)}
              </div>
              <FieldDescription className="text-xs">{t.diffHint}</FieldDescription>
            </div>
            <Field>
              <FieldLabel>{t.cause}</FieldLabel>
              <Controller
                control={control}
                name="cause"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-2">
                    {CAUSES.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={c} />
                        {causes[c]}
                      </label>
                    ))}
                  </RadioGroup>
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="disc-note">{t.note}</FieldLabel>
              <Textarea id="disc-note" rows={2} placeholder={t.notePlaceholder} {...register("note")} />
              <FieldError>{errors.note?.message}</FieldError>
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

export default DiscrepancyFormDialog;
