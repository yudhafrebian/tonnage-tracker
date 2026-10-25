"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermission } from "@/features/auth";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { cn } from "cn";
import { format } from "date-fns";
import {
  AlertTriangleIcon,
  CircleDollarSignIcon,
  LockIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { usePriceRatesQuery } from "../api/price-rate.query";
import { buildTimeline } from "../lib/timeline";
import type { PriceRateDialogState } from "../types/types";
import DeletePriceRateDialog from "./delete-price-rate-dialog";
import PriceRateFormDialog from "./price-rate-form-dialog";

const PriceRatePage = () => {
  const { dict } = useI18n();
  const t = dict.priceRate;
  const fmt = useFormatter();
  // Baca: OWNER & ADMIN. Ubah: hanya OWNER.
  const { allowed: canWrite } = usePermission("price-rate:write");
  const { data, isPending, error, refetch, isRefetching } = usePriceRatesQuery();
  const [dialog, setDialog] = useState<PriceRateDialogState>({ type: null });
  const closeDialog = () => setDialog({ type: null });

  const today = format(new Date(), "yyyy-MM-dd");
  const rows = useMemo(() => (data ? buildTimeline(data, today) : []), [data, today]);
  const current = rows.find((r) => r.status === "active");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold md:text-3xl">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
        {canWrite ? (
          <Button className="shrink-0" onClick={() => setDialog({ type: "create" })}>
            <Plus />
            {t.addData}
          </Button>
        ) : (
          <p className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
            <LockIcon className="size-4" />
            {t.readOnly}
          </p>
        )}
      </div>

      {isPending ? (
        <>
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-md border p-10 text-center">
          <p className="text-destructive">{apiErrorMessage(dict, error)}</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            <RotateCw className={isRefetching ? "animate-spin" : undefined} />
            {t.retry}
          </Button>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <CircleDollarSignIcon size={22} /> {t.current}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {current ? (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-3xl font-semibold tabular-nums">
                    {fmt.rupiah(current.pricePerKg)}
                    <span className="ml-1 text-base font-normal text-muted-foreground">
                      {t.perKg}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {fill(t.since, { date: fmt.date(current.effectiveFrom) })}
                  </p>
                </div>
              ) : (
                // Tanpa tarif aktif, pemasukan rekap tidak terhitung: tonjolkan sebagai peringatan.
                <div className="flex items-start gap-3 text-amber-700 dark:text-amber-400">
                  <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="font-medium">{t.noCurrent}</p>
                    <p className="text-sm">{t.noCurrentHint}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{t.history}</h2>
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-10 text-center">
                <CircleDollarSignIcon className="size-10 text-muted-foreground" />
                <p className="text-muted-foreground">{t.empty}</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.priceRate.form.effectiveFrom}</TableHead>
                      <TableHead className="text-right">{t.form.pricePerKg}</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">%</TableHead>
                      <TableHead />
                      {canWrite && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow
                        key={r.id}
                        className={cn(r.status === "past" && "text-muted-foreground")}
                      >
                        <TableCell className="whitespace-normal tabular-nums">
                          {fmt.date(r.effectiveFrom)} –{" "}
                          {r.until ? fmt.date(r.until) : t.present}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {fmt.rupiah(r.pricePerKg)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "hidden text-right tabular-nums sm:table-cell",
                            r.changePct !== null && r.changePct > 0 && "text-emerald-600 dark:text-emerald-400",
                            r.changePct !== null && r.changePct < 0 && "text-destructive",
                          )}
                        >
                          {r.changePct === null
                            ? "—"
                            : `${r.changePct > 0 ? "▲" : r.changePct < 0 ? "▼" : ""} ${Math.abs(r.changePct)}%`}
                        </TableCell>
                        <TableCell>
                          {r.status === "active" && <Badge>{t.active}</Badge>}
                          {r.status === "scheduled" && (
                            <Badge variant="outline">{t.scheduled}</Badge>
                          )}
                        </TableCell>
                        {canWrite && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button size="icon-xs" variant="ghost" aria-label={t.actions.menu}>
                                    <MoreHorizontal />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem onClick={() => setDialog({ type: "edit", rate: r })}>
                                  <Pencil />
                                  {t.actions.edit}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDialog({ type: "delete", rate: r })}
                                >
                                  <Trash2 />
                                  {t.actions.delete}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}

      {dialog.type === "create" && (
        <PriceRateFormDialog defaultDate={today} onClose={closeDialog} />
      )}
      {dialog.type === "edit" && (
        <PriceRateFormDialog defaultDate={today} rate={dialog.rate} onClose={closeDialog} />
      )}
      {dialog.type === "delete" && (
        <DeletePriceRateDialog rate={dialog.rate} onClose={closeDialog} />
      )}
    </div>
  );
};

export default PriceRatePage;
