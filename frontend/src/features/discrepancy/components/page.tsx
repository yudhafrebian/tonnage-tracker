"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/features/auth";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { cn } from "cn";
import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcwIcon,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useDiscrepanciesQuery, useUpdateDiscrepancyMutation } from "../api/discrepancy.query";
import type { Discrepancy, DiscrepancyStatus } from "../types/types";
import { DeleteDiscrepancyDialog, goodsLabel, ResolveDiscrepancyDialog } from "./discrepancy-dialogs";
import DiscrepancyFormDialog from "./discrepancy-form-dialog";

type Filter = DiscrepancyStatus | "ALL";
type DialogState =
  | { type: null }
  | { type: "create" }
  | { type: "edit" | "resolve" | "delete"; item: Discrepancy };

const DiscrepancyPage = () => {
  const { dict } = useI18n();
  const t = dict.discrepancy;
  const fmt = useFormatter();
  const { allowed: canWrite } = usePermission("journal:write");
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [dialog, setDialog] = useState<DialogState>({ type: null });
  const { data, isPending, isFetching, error, refetch } = useDiscrepanciesQuery(filter === "ALL" ? undefined : filter);
  const reopen = useUpdateDiscrepancyMutation();
  const close = () => setDialog({ type: null });

  // Selisih bertanda: "+4" / "−20" (tanpa tanda untuk 0).
  const signed = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt.kg(Math.abs(n))}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold md:text-3xl">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
        {canWrite && (
          <Button className="shrink-0" onClick={() => setDialog({ type: "create" })}>
            <Plus />
            {t.add}
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          {(["OPEN", "RESOLVED", "ALL"] as const).map((f) => (
            <TabsTrigger key={f} value={f} className="gap-1.5">
              {t.filters[f]}
              {f === "OPEN" && data && data.openCount > 0 && <Badge variant="secondary">{data.openCount}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isPending ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-md border p-10 text-center">
          <p className="text-destructive">{apiErrorMessage(dict, error)}</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RotateCw />
            {dict.expense.retry}
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-10 text-center">
          <ClipboardCheckIcon className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">{filter === "OPEN" ? t.emptyOpen : t.empty}</p>
        </div>
      ) : (
        <div className={cn("overflow-hidden rounded-md border transition-opacity", isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.table.date}</TableHead>
                <TableHead>{t.table.goods}</TableHead>
                <TableHead className="text-right">{t.table.mc}</TableHead>
                <TableHead className="text-right">{t.table.kg}</TableHead>
                <TableHead>{t.table.cause}</TableHead>
                <TableHead className="hidden lg:table-cell">{t.table.note}</TableHead>
                <TableHead>{t.table.status}</TableHead>
                {canWrite && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((d) => (
                <TableRow key={d.id} className={cn(d.status === "RESOLVED" && "text-muted-foreground")}>
                  <TableCell className="tabular-nums">{fmt.dayMonth(d.date)}</TableCell>
                  <TableCell className="whitespace-normal font-medium">{goodsLabel(d)}</TableCell>
                  <TableCell className="text-right tabular-nums">{signed(d.mcDiff)}</TableCell>
                  <TableCell className="text-right tabular-nums">{signed(d.kgDiff)}</TableCell>
                  <TableCell>{t.causes[d.cause]}</TableCell>
                  <TableCell className="hidden max-w-72 whitespace-normal lg:table-cell">
                    {d.note ?? "—"}
                    {d.resolution && (
                      <p className="mt-1 text-xs text-muted-foreground">{fill(t.resolvedNote, { note: d.resolution })}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.status === "OPEN" ? "outline" : "secondary"} className={cn(d.status === "OPEN" && "border-amber-500 text-amber-700 dark:text-amber-400")}>
                      {t.statuses[d.status]}
                    </Badge>
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
                        <DropdownMenuContent align="end" className="w-44">
                          {d.status === "OPEN" ? (
                            <DropdownMenuItem onClick={() => setDialog({ type: "resolve", item: d })}>
                              <CheckCircle2Icon />
                              {t.actions.resolve}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => reopen.mutate({ id: d.id, payload: { status: "OPEN", resolution: null } })}
                            >
                              <RotateCcwIcon />
                              {t.actions.reopen}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setDialog({ type: "edit", item: d })}>
                            <Pencil />
                            {t.actions.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDialog({ type: "delete", item: d })}>
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

      {dialog.type === "create" && <DiscrepancyFormDialog onClose={close} />}
      {dialog.type === "edit" && <DiscrepancyFormDialog discrepancy={dialog.item} onClose={close} />}
      {dialog.type === "resolve" && <ResolveDiscrepancyDialog discrepancy={dialog.item} onClose={close} />}
      {dialog.type === "delete" && <DeleteDiscrepancyDialog discrepancy={dialog.item} onClose={close} />}
    </div>
  );
};

export default DiscrepancyPage;
