"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage } from "@/shared/i18n/api-error";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { cn } from "cn";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HistoryIcon,
  RotateCw,
  XIcon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { useAuditLogsQuery } from "../api/audit-log.query";
import { snapshotSubject } from "../lib/diff";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  type AuditAction,
  type AuditEntity,
  type AuditLogFilters,
} from "../types/types";
import ChangesTable from "./changes-table";

const ALL = "all";

const ACTION_VARIANT: Record<AuditAction, "secondary" | "outline" | "destructive"> = {
  create: "secondary",
  import: "secondary",
  update: "outline",
  delete: "destructive",
};

const AuditLogPage = () => {
  const { dict } = useI18n();
  const t = dict.auditLog;
  const fmt = useFormatter();
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1 });
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isPending, isFetching, error, refetch } = useAuditLogsQuery(filters);

  // Ganti filter apa pun = kembali ke halaman 1.
  const setFilter = (patch: Partial<AuditLogFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const hasFilter = !!(filters.entity || filters.action || filters.from || filters.to);

  const entityItems = {
    [ALL]: t.filters.all,
    ...Object.fromEntries(AUDIT_ENTITIES.map((e) => [e, t.entities[e]])),
  };
  const actionItems = {
    [ALL]: t.filters.all,
    ...Object.fromEntries(AUDIT_ACTIONS.map((a) => [a, t.actionLabels[a]])),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-md border p-4">
        <h1 className="text-2xl font-bold md:text-3xl">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>

      {/* Semua filter dalam satu baris (membungkus di HP). */}
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-40">
          <FieldLabel>{t.filters.entity}</FieldLabel>
          <Select
            items={entityItems}
            value={filters.entity ?? ALL}
            onValueChange={(v) =>
              setFilter({ entity: v === ALL ? undefined : (v as AuditEntity) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(entityItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-36">
          <FieldLabel>{t.filters.action}</FieldLabel>
          <Select
            items={actionItems}
            value={filters.action ?? ALL}
            onValueChange={(v) =>
              setFilter({ action: v === ALL ? undefined : (v as AuditAction) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(actionItems).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-40">
          <FieldLabel htmlFor="audit-from">{t.filters.from}</FieldLabel>
          <Input
            id="audit-from"
            type="date"
            value={filters.from ?? ""}
            max={filters.to}
            onChange={(e) => setFilter({ from: e.target.value || undefined })}
          />
        </Field>
        <Field className="w-40">
          <FieldLabel htmlFor="audit-to">{t.filters.to}</FieldLabel>
          <Input
            id="audit-to"
            type="date"
            value={filters.to ?? ""}
            min={filters.from}
            onChange={(e) => setFilter({ to: e.target.value || undefined })}
          />
        </Field>
        {hasFilter && (
          <Button variant="ghost" onClick={() => setFilters({ page: 1 })}>
            <XIcon />
            {t.filters.reset}
          </Button>
        )}
      </div>

      {isPending ? (
        <Skeleton className="h-96" />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-md border p-10 text-center">
          <p className="text-destructive">{apiErrorMessage(dict, error)}</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RotateCw />
            {t.retry}
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-10 text-center">
          <HistoryIcon className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "overflow-hidden rounded-md border transition-opacity",
              isFetching && "opacity-60",
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.table.time}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.table.user}</TableHead>
                  <TableHead>{t.table.action}</TableHead>
                  <TableHead>{t.table.subject}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => {
                  const open = expanded === item.id;
                  const subject = snapshotSubject(item.after ?? item.before);
                  return (
                    <Fragment key={item.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpanded(open ? null : item.id)}
                      >
                        <TableCell className="tabular-nums text-muted-foreground">
                          {fmt.dateTime(item.createdAt)}
                          <span className="block text-xs sm:hidden">{item.user.name}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{item.user.name}</TableCell>
                        <TableCell>
                          <Badge variant={ACTION_VARIANT[item.action]}>
                            {t.actionLabels[item.action]}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <span className="font-medium">{t.entities[item.entity]}</span>
                          <span className="text-muted-foreground">
                            {subject.category && ` · ${subject.category}`}
                            {subject.date && ` · ${fmt.date(subject.date)}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={t.showChanges}
                            aria-expanded={open}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpanded(open ? null : item.id);
                            }}
                          >
                            <ChevronDownIcon
                              className={cn("transition-transform", open && "rotate-180")}
                            />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={5} className="whitespace-normal px-4 py-3">
                            <ChangesTable item={item} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {fill(t.pageInfo, {
                page: data.page,
                pages: Math.max(1, data.totalPages),
                total: data.total,
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1 || isFetching}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                <ChevronLeftIcon />
                {t.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages || isFetching}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                {t.next}
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditLogPage;
