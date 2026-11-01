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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useCreateEntriesMutation } from "../api/journal.query";
import { makeEntrySchemas, type CreateEntriesFormOutput, type CreateEntriesFormValues } from "../schemas";
import { MARKETS, type JournalSection } from "../types/types";

interface EntryFormDialogProps {
  date: string;
  section: JournalSection;
  onClose: () => void;
}

const emptyRow = { item: "", size: "", mc: Number.NaN, kg: Number.NaN };

// Tambah baris manual: satu supplier/pelanggan + pasar, lalu beberapa baris barang
// (pola laporan barang keluar staf). Semua diketik bebas, tanpa perhitungan otomatis.
const EntryFormDialog = ({ date, section, onClose }: EntryFormDialogProps) => {
  const { dict } = useI18n();
  const t = dict.journalManual.form;
  const tj = dict.journal;
  const fmt = useFormatter();
  const schema = useMemo(() => makeEntrySchemas(dict.journalManual.form).create, [dict]);
  const hasMc = section !== "PROCESS";

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEntriesFormValues, unknown, CreateEntriesFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { party: "", market: "LOCAL", rows: [emptyRow] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "rows" });
  const rows = useWatch({ control, name: "rows" });
  const sum = (key: "mc" | "kg") => rows.reduce((acc, r) => acc + (Number.isFinite(r[key]) ? (r[key] as number) : 0), 0);

  const { mutate, isPending } = useCreateEntriesMutation();
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = (v: CreateEntriesFormOutput) => {
    setServerError(null);
    mutate(
      {
        date,
        section,
        party: v.party,
        market: v.market,
        rows: v.rows.map((r) => ({ item: r.item, size: r.size || null, mc: hasMc ? r.mc : null, kg: r.kg })),
      },
      { onSuccess: onClose, onError: (err) => setServerError(apiErrorMessage(dict, err)) },
    );
  };

  const partyLabel = section === "OUT" ? tj.table.customer : tj.table.supplier;

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{fill(t.addTitle, { section: tj.tabs[section], date: fmt.date(date) })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {serverError && <FieldError>{serverError}</FieldError>}
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field>
              <FieldLabel htmlFor="entry-party">{partyLabel}</FieldLabel>
              <Input id="entry-party" autoComplete="off" autoFocus {...register("party")} />
              <FieldError>{errors.party?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel>{t.market}</FieldLabel>
              <Controller
                control={control}
                name="market"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="flex h-8 items-center gap-4">
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
          </div>

          <div className="max-h-[50vh] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr className="text-left">
                  <th className="px-2 py-1.5 font-medium">{tj.table.item}</th>
                  <th className="w-32 px-2 py-1.5 font-medium">{tj.table.size}</th>
                  {hasMc && <th className="w-24 px-2 py-1.5 text-right font-medium">{tj.table.mc}</th>}
                  <th className="w-28 px-2 py-1.5 text-right font-medium">{tj.table.kg}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => {
                  const e = errors.rows?.[i];
                  return (
                    <tr key={f.id} className="border-t align-top">
                      <td className="p-1.5">
                        <Input aria-label={tj.table.item} aria-invalid={!!e?.item} {...register(`rows.${i}.item`)} />
                        {e?.item && <p className="mt-1 text-xs text-destructive">{e.item.message}</p>}
                      </td>
                      <td className="p-1.5">
                        <Input aria-label={tj.table.size} {...register(`rows.${i}.size`)} />
                      </td>
                      {hasMc && (
                        <td className="p-1.5">
                          <Input
                            aria-label={tj.table.mc}
                            type="number"
                            step="0.01"
                            className="text-right tabular-nums"
                            aria-invalid={!!e?.mc}
                            {...register(`rows.${i}.mc`, { valueAsNumber: true })}
                          />
                          {e?.mc && <p className="mt-1 text-xs text-destructive">{e.mc.message}</p>}
                        </td>
                      )}
                      <td className="p-1.5">
                        <Input
                          aria-label={tj.table.kg}
                          type="number"
                          step="0.01"
                          className="text-right tabular-nums"
                          aria-invalid={!!e?.kg}
                          {...register(`rows.${i}.kg`, { valueAsNumber: true })}
                        />
                        {e?.kg && <p className="mt-1 text-xs text-destructive">{e.kg.message}</p>}
                      </td>
                      <td className="p-1.5">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t.removeRow}
                          disabled={fields.length === 1}
                          onClick={() => remove(i)}
                        >
                          <Trash2Icon />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyRow)}>
              <PlusIcon />
              {t.addRow}
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              {hasMc
                ? fill(t.total, { mc: fmt.kg(sum("mc")), kg: fmt.kg(sum("kg")) })
                : `${tj.total}: ${fmt.kg(sum("kg"))} kg`}
            </span>
          </div>

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

export default EntryFormDialog;
