import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useMemo, useState } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import {
  CreateRecapFormValues,
  makeCreateRecapSchema,
  toCreateRecapPayload,
  toUpdateRecapPayload,
} from "../schemas";
import { useCreateRecapMutation, useUpdateRecapMutation } from "../api/recap.query";
import type { Recap } from "../types/types";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { apiErrorMessage, fieldErrorMessage } from "@/shared/i18n/api-error";
import { isAxiosError } from "axios";
import { useI18n } from "@/shared/i18n/i18n-provider";

interface CreateRecapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // "2026-10-05": dari tombol + di baris tanggal kosong. Kosong = hari ini.
  defaultDate?: string;
  // Diisi = mode Edit: form terisi dari rekap ini, tanggal dikunci, simpan lewat PATCH.
  recap?: Recap;
}

const CreateRecapDialog: React.FC<CreateRecapDialogProps> = (props) => {
  const { dict } = useI18n();
  const t = dict.recap;
  const editing = props.recap !== undefined;
  const schema = useMemo(() => makeCreateRecapSchema(dict.recap.validation), [dict]);

  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: { errors },
  } = useForm<CreateRecapFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: props.recap?.date ?? props.defaultDate ?? format(new Date(), "yyyy-MM-dd"),
      method: "export_local",
      process: props.recap?.process ?? { total: 0, export: 0, local: 0 },
      packing: props.recap?.packing ?? { total: 0, export: 0, local: 0 },
      stock: props.recap?.stock ?? { total: 0, export: 0, local: 0 },
      note: props.recap?.note ?? "",
    },
  });

  const sum = (s: { export: number; local: number }) => {
    const total = s.export + s.local;
    return Number.isFinite(total) ? Math.round(total * 100) / 100 : "";
  };

  const createMutation = useCreateRecapMutation();
  const updateMutation = useUpdateRecapMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;
  // Error server yang tidak terkait field tertentu (mis. server mati, 403).
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = (data: CreateRecapFormValues) => {
    setServerError(null);
    const callbacks = {
        onSuccess: () => props.onOpenChange(false),
        onError: (err: Error) => {
          // Backend mengirim error per field, mis. { date: ["recap_already_exists"] }
          // atau { "process.export": ["exceeds_total"] }: tampilkan di bawah input terkait.
          const fields = isAxiosError(err)
            ? (err.response?.data?.error?.fields as Record<string, string[]> | undefined)
            : undefined;
          if (fields && Object.keys(fields).length > 0) {
            for (const [path, codes] of Object.entries(fields)) {
              setError(path as Path<CreateRecapFormValues>, {
                message: fieldErrorMessage(dict, codes[0] ?? ""),
              });
            }
          } else {
            setServerError(apiErrorMessage(dict, err));
          }
        },
    };

    if (editing) {
      updateMutation.mutate(
        { date: data.date, method: data.method, payload: toUpdateRecapPayload(data) },
        callbacks,
      );
    } else {
      createMutation.mutate(
        { method: data.method, payload: toCreateRecapPayload(data) },
        callbacks,
      );
    }
  };

  const process = useWatch({ control, name: "process" });
  const packing = useWatch({ control, name: "packing" });
  const stock = useWatch({ control, name: "stock" });

  return (
    // Selama menyimpan, Esc / klik di luar tidak menutup dialog.
    <Dialog open={props.open} onOpenChange={(open) => !isPending && props.onOpenChange(open)}>
      <DialogContent className={"sm:min-w-2xl"}>
        <DialogHeader>
          <DialogTitle>{editing ? t.form.editTitle : t.form.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldSet className=" py-4 max-h-[80vh] overflow-y-auto">
            {serverError && <FieldError>{serverError}</FieldError>}

            <Field>
              <FieldLabel htmlFor="date">{t.form.date}</FieldLabel>
              <Input
                id="date"
                type="date"
                // Tanggal adalah kunci rekap (PATCH /recaps/:date), jadi tidak bisa diubah saat edit.
                readOnly={editing}
                {...register("date")}
              />
              <FieldError>{errors.date?.message?.toString()}</FieldError>
            </Field>
            <FieldSeparator />
            <p>{t.sections.process}</p>
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>{t.parts.export}</FieldLabel>
                <Input
                  {...register("process.export", { valueAsNumber: true })}
                  type="number" step="0.01"
                />
                <FieldError>
                  {errors.process?.export?.message?.toString()}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel>{t.parts.local}</FieldLabel>
                <Input
                  {...register("process.local", { valueAsNumber: true })}
                  type="number" step="0.01"
                />
                <FieldError>
                  {errors.process?.local?.message?.toString()}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel>{t.parts.total}</FieldLabel>
                <Input
                  {...register("process.total", { valueAsNumber: true })}
                  value={sum(process)}
                  type="number" step="0.01"
                  readOnly
                />
                <FieldDescription className="text-xs">
                  {t.form.autoTotal}
                </FieldDescription>
              </Field>
            </FieldGroup>
            <FieldSeparator />
            <p>{t.sections.packing}</p>
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>{t.parts.export}</FieldLabel>
                <Input
                  {...register("packing.export", { valueAsNumber: true })}
                  type="number" step="0.01"
                />
                <FieldError>
                  {errors.packing?.export?.message?.toString()}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel>{t.parts.local}</FieldLabel>
                <Input
                  {...register("packing.local", { valueAsNumber: true })}
                  type="number" step="0.01"
                />
                <FieldError>
                  {errors.packing?.local?.message?.toString()}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel>{t.parts.total}</FieldLabel>
                <Input
                  {...register("packing.total", { valueAsNumber: true })}
                  type="number" step="0.01"
                  value={sum(packing)}
                  readOnly
                />
                <FieldDescription className="text-xs">
                  {t.form.autoTotal}
                </FieldDescription>
              </Field>
            </FieldGroup>
            <FieldSeparator />
            <p>{t.sections.stock}</p>
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>{t.parts.export}</FieldLabel>
                <Input
                  {...register("stock.export", { valueAsNumber: true })}
                  type="number" step="0.01"
                />
                <FieldError>
                  {errors.stock?.export?.message?.toString()}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel>{t.parts.local}</FieldLabel>
                <Input
                  {...register("stock.local", { valueAsNumber: true })}
                  type="number" step="0.01"
                />
                <FieldError>
                  {errors.stock?.local?.message?.toString()}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel>{t.parts.total}</FieldLabel>
                <Input
                  {...register("stock.total", { valueAsNumber: true })}
                  type="number" step="0.01"
                  value={sum(stock)}
                  readOnly
                />
                <FieldDescription className="text-xs">
                  {t.form.autoTotal}
                </FieldDescription>
              </Field>
            </FieldGroup>
            <FieldSeparator />
            <Field>
              <FieldLabel>{t.form.note}</FieldLabel>
              <Input {...register("note")} type="text" />
            </Field>
          </FieldSet>
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="outline" disabled={isPending} />}
            >
              {t.form.cancel}
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner />}
              {isPending ? t.form.saving : t.form.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRecapDialog;
