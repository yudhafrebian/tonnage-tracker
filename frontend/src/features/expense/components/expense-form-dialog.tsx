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
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage, fieldErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { cn } from "cn";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch, type Path } from "react-hook-form";
import {
  useCreateExpenseMutation,
  useExpenseCategoriesQuery,
  useUpdateExpenseMutation,
} from "../api/expense.query";
import {
  makeExpenseSchema,
  toCreateExpensePayload,
  toUpdateExpensePayload,
  type ExpenseFormValues,
} from "../schemas";
import type { Expense } from "../types/types";
import AmountInput from "@/shared/components/ui/amount-input";

// Jumlah kategori yang ditampilkan sebagai tombol pilih cepat di bawah input.
const QUICK_CATEGORIES = 6;

interface ExpenseFormDialogProps {
  onClose: () => void;
  // "2026-10-21": tanggal awal untuk tambah baru.
  defaultDate: string;
  // Diisi = mode Edit: form terisi dari pengeluaran ini, simpan lewat PATCH.
  expense?: Expense;
}

// Dirender hanya saat terbuka, jadi form selalu mulai dari nilai awal.
const ExpenseFormDialog = ({ onClose, defaultDate, expense }: ExpenseFormDialogProps) => {
  const { dict } = useI18n();
  const t = dict.expense;
  const editing = expense !== undefined;
  const schema = useMemo(() => makeExpenseSchema(dict.expense.validation), [dict]);

  const {
    handleSubmit,
    register,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: expense?.date ?? defaultDate,
      category: expense?.category ?? "",
      amount: expense?.amount,
      note: expense?.note ?? "",
    },
  });

  const { data: categories = [] } = useExpenseCategoriesQuery();
  const category = useWatch({ control, name: "category" });

  const createMutation = useCreateExpenseMutation();
  const updateMutation = useUpdateExpenseMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;
  // Error server yang tidak terkait field tertentu (mis. server mati, 403).
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = (data: ExpenseFormValues) => {
    setServerError(null);
    const callbacks = {
      onSuccess: onClose,
      onError: (err: Error) => {
        // Backend mengirim error per field, mis. { amount: ["too_big"] }: tampilkan di bawah input terkait.
        const fields = isAxiosError(err)
          ? (err.response?.data?.error?.fields as Record<string, string[]> | undefined)
          : undefined;
        if (fields && Object.keys(fields).length > 0) {
          for (const [path, codes] of Object.entries(fields)) {
            setError(path as Path<ExpenseFormValues>, {
              message: fieldErrorMessage(dict, codes[0] ?? ""),
            });
          }
        } else {
          setServerError(apiErrorMessage(dict, err));
        }
      },
    };

    if (expense) {
      updateMutation.mutate({ id: expense.id, payload: toUpdateExpensePayload(data) }, callbacks);
    } else {
      createMutation.mutate(toCreateExpensePayload(data), callbacks);
    }
  };

  return (
    // Selama menyimpan, Esc / klik di luar tidak menutup dialog.
    <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t.form.editTitle : t.form.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldSet className="py-4">
            {serverError && <FieldError>{serverError}</FieldError>}
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="expense-date">{t.form.date}</FieldLabel>
                <Input id="expense-date" type="date" {...register("date")} />
                <FieldError>{errors.date?.message}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="expense-amount">{t.form.amount}</FieldLabel>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field, fieldState }) => (
                    <AmountInput
                      id="expense-amount"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                    />
                  )}
                />
                <FieldError>{errors.amount?.message}</FieldError>
              </Field>
            </FieldGroup>

            <Field>
              <FieldLabel htmlFor="expense-category">{t.form.category}</FieldLabel>
              {/* Teks bebas + saran dari kategori yang sudah ada; backend menyamakan ejaannya. */}
              <Input
                id="expense-category"
                list="expense-category-options"
                autoComplete="off"
                placeholder={t.form.categoryPlaceholder}
                {...register("category")}
              />
              <datalist id="expense-category-options">
                {categories.map((c) => (
                  <option key={c.category} value={c.category} />
                ))}
              </datalist>
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {categories.slice(0, QUICK_CATEGORIES).map((c) => {
                    const active = c.category.toLowerCase() === category.trim().toLowerCase();
                    return (
                      <Button
                        key={c.category}
                        type="button"
                        size="xs"
                        variant={active ? "secondary" : "outline"}
                        className={cn("rounded-full", active && "border-primary")}
                        onClick={() =>
                          setValue("category", c.category, { shouldValidate: true })
                        }
                      >
                        {c.category}
                      </Button>
                    );
                  })}
                </div>
              )}
              <FieldDescription className="text-xs">{t.form.categoryHint}</FieldDescription>
              <FieldError>{errors.category?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="expense-note">{t.form.note}</FieldLabel>
              <Textarea
                id="expense-note"
                rows={2}
                placeholder={t.form.notePlaceholder}
                {...register("note")}
              />
              <FieldError>{errors.note?.message}</FieldError>
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

export default ExpenseFormDialog;
