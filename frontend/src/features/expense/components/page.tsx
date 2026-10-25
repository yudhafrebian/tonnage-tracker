"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/features/auth";
import MonthSelector from "@/features/recap/components/month-selector";
import { currentMonth, formatMonth } from "@/features/recap/lib/month";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { format } from "date-fns";
import { Plus, ReceiptTextIcon, RotateCw } from "lucide-react";
import { useState } from "react";
import { useMonthlyExpenseQuery } from "../api/expense.query";
import type { ExpenseDialogState } from "../types/types";
import CategoryBreakdown from "./category-breakdown";
import DeleteExpenseDialog from "./delete-expense-dialog";
import ExpenseFormDialog from "./expense-form-dialog";
import ExpenseSummary from "./expense-summary";
import ExpenseTable from "./expense-table";

const LoadingState = () => (
  <>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-80 lg:col-span-2" />
      <Skeleton className="h-64" />
    </div>
  </>
);

const EmptyState = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-10 text-center">
    <ReceiptTextIcon className="size-10 text-muted-foreground" />
    <p className="text-muted-foreground">{title}</p>
    {action}
  </div>
);

const ExpensePage = () => {
  const { lang, dict } = useI18n();
  const t = dict.expense;
  const [month, setMonth] = useState(currentMonth);
  // Filter di client: ringkasan & grafik tetap untuk seluruh bulan.
  const [category, setCategory] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ExpenseDialogState>({ type: null });
  const { allowed: canWrite } = usePermission("expense:write");
  const { data, isPending, error, refetch, isRefetching } = useMonthlyExpenseQuery(month);

  // Tambah baru di bulan yang sedang dilihat: hari ini kalau bulan berjalan, selain itu tanggal 1.
  const defaultDate = month === currentMonth() ? format(new Date(), "yyyy-MM-dd") : `${month}-01`;
  const items = data ? data.items.filter((e) => !category || e.category === category) : [];
  const closeDialog = () => setDialog({ type: null });

  const addButton = canWrite && (
    <Button onClick={() => setDialog({ type: "create" })}>
      <Plus />
      {t.addData}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* HP: ditumpuk; sm ke atas: judul di kiri, navigasi bulan + aksi di kanan (sama dengan Rekap). */}
      <div className="flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">
          {t.title} {formatMonth(month, lang)}
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <MonthSelector
            value={month}
            onChange={(next) => {
              setMonth(next);
              setCategory(null);
            }}
            label={formatMonth(month, lang)}
          />
          {addButton}
        </div>
      </div>

      {isPending ? (
        <LoadingState />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-md border p-10 text-center">
          <p className="text-destructive">{apiErrorMessage(dict, error)}</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            <RotateCw className={isRefetching ? "animate-spin" : undefined} />
            {t.retry}
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title={t.empty} action={addButton} />
      ) : (
        <>
          <ExpenseSummary data={data} />

          {/* Pilih kategori lewat chip (cepat di HP) atau klik bar di kartu Per Kategori. */}
          <div className="flex flex-wrap gap-1.5">
            {[null, ...data.byCategory.map((c) => c.category)].map((c) => (
              <Button
                key={c ?? "__all"}
                size="sm"
                variant={category === c ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setCategory(c)}
              >
                {c ?? t.allCategories}
              </Button>
            ))}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              {items.length === 0 ? (
                <EmptyState title={t.emptyFiltered} />
              ) : (
                <ExpenseTable
                  items={items}
                  onEdit={canWrite ? (expense) => setDialog({ type: "edit", expense }) : undefined}
                  onDelete={
                    canWrite ? (expense) => setDialog({ type: "delete", expense }) : undefined
                  }
                />
              )}
            </div>
            <CategoryBreakdown
              items={data.byCategory}
              total={data.total}
              selected={category}
              onSelect={setCategory}
            />
          </div>
        </>
      )}

      {/* Dialog hanya dirender saat terbuka, jadi form selalu mulai dari nilai awal. */}
      {dialog.type === "create" && (
        <ExpenseFormDialog defaultDate={defaultDate} onClose={closeDialog} />
      )}
      {dialog.type === "edit" && (
        <ExpenseFormDialog
          defaultDate={dialog.expense.date}
          expense={dialog.expense}
          onClose={closeDialog}
        />
      )}
      {dialog.type === "delete" && (
        <DeleteExpenseDialog expense={dialog.expense} onClose={closeDialog} />
      )}
    </div>
  );
};

export default ExpensePage;
