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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import AmountInput from "@/shared/components/ui/amount-input";
import { apiErrorMessage, fieldErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useMemo, useState } from "react";
import { Controller, useForm, type Path } from "react-hook-form";
import {
  useCreatePriceRateMutation,
  useUpdatePriceRateMutation,
} from "../api/price-rate.query";
import { makePriceRateSchema, type PriceRateFormValues } from "../schemas";
import type { PriceRate } from "../types/types";

interface PriceRateFormDialogProps {
  onClose: () => void;
  defaultDate: string;
  // Diisi = mode Edit, simpan lewat PATCH.
  rate?: PriceRate;
}

const PriceRateFormDialog = ({ onClose, defaultDate, rate }: PriceRateFormDialogProps) => {
  const { dict } = useI18n();
  const t = dict.priceRate;
  const schema = useMemo(() => makePriceRateSchema(dict.priceRate.validation), [dict]);

  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: { errors },
  } = useForm<PriceRateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      effectiveFrom: rate?.effectiveFrom ?? defaultDate,
      pricePerKg: rate?.pricePerKg,
    },
  });

  const createMutation = useCreatePriceRateMutation();
  const updateMutation = useUpdatePriceRateMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = (data: PriceRateFormValues) => {
    setServerError(null);
    const callbacks = {
      onSuccess: onClose,
      onError: (err: Error) => {
        // Tanggal yang sudah dipakai tarif lain -> { effectiveFrom: ["already_exists"] }.
        const fields = isAxiosError(err)
          ? (err.response?.data?.error?.fields as Record<string, string[]> | undefined)
          : undefined;
        if (fields && Object.keys(fields).length > 0) {
          for (const [path, codes] of Object.entries(fields)) {
            setError(path as Path<PriceRateFormValues>, {
              message: fieldErrorMessage(dict, codes[0] ?? ""),
            });
          }
        } else {
          setServerError(apiErrorMessage(dict, err));
        }
      },
    };

    if (rate) {
      updateMutation.mutate({ id: rate.id, payload: data }, callbacks);
    } else {
      createMutation.mutate(data, callbacks);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rate ? t.form.editTitle : t.form.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldSet className="py-4">
            {serverError && <FieldError>{serverError}</FieldError>}
            <Field>
              <FieldLabel htmlFor="rate-from">{t.form.effectiveFrom}</FieldLabel>
              <Input id="rate-from" type="date" {...register("effectiveFrom")} />
              <FieldDescription className="text-xs">{t.form.effectiveFromHint}</FieldDescription>
              <FieldError>{errors.effectiveFrom?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="rate-price">{t.form.pricePerKg}</FieldLabel>
              <Controller
                control={control}
                name="pricePerKg"
                render={({ field, fieldState }) => (
                  <AmountInput
                    id="rate-price"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-invalid={fieldState.invalid}
                  />
                )}
              />
              <FieldError>{errors.pricePerKg?.message}</FieldError>
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

export default PriceRateFormDialog;
