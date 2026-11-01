"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  apiErrorMessage,
  excelRowMessage,
  fieldErrorMessage,
  type ExcelRowError,
} from "@/shared/i18n/api-error";
import { format as fill } from "@/shared/i18n/format";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { isAxiosError } from "axios";
import { cn } from "cn";
import { ChevronRightIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { useImportJournalMutation } from "../api/journal.query";
import { MARKETS, type ImportEntry, type ImportPreview, type Market } from "../types/types";

interface ImportJournalDialogProps {
  onClose: () => void;
  // Dipanggil setelah tersimpan dengan tanggal terakhir di file, supaya halaman langsung membukanya.
  onImported: (lastDate: string) => void;
}

type ImportErrors = { rows?: (ExcelRowError & { sheet?: string })[]; file?: string; general?: string };

// Dropdown native: ratusan baris per supplier tetap ringan.
const MarketSelect = ({
  value,
  onChange,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  value: Market | null;
  onChange: (m: Market) => void;
  placeholder?: string;
  className?: string;
  "aria-label": string;
}) => {
  const t = useI18n().dict.journal;
  return (
    <select
      aria-label={ariaLabel}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value as Market)}
      className={cn(
        "h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
        value === null && "border-amber-500 text-muted-foreground",
        className,
      )}
    >
      {value === null && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {MARKETS.map((m) => (
        <option key={m} value={m}>
          {t.markets[m]}
        </option>
      ))}
    </select>
  );
};

// Dua langkah: pilih file -> Pratinjau (tanpa menyimpan, pilih Ekspor/Lokal) -> Simpan.
const ImportJournalDialog = ({ onClose, onImported }: ImportJournalDialogProps) => {
  const { dict } = useI18n();
  const t = dict.journal.importDialog;
  const tabs = dict.journal.tabs;
  const fmt = useFormatter();
  const { mutate, isPending } = useImportJournalMutation();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errors, setErrors] = useState<ImportErrors>({});
  // Label per supplier (null = belum dipilih) dan label per baris yang berbeda dari suppliernya.
  const [supplierMarket, setSupplierMarket] = useState<Record<string, Market | null>>({});
  const [rowMarket, setRowMarket] = useState<Record<string, Market>>({});
  const [open, setOpen] = useState<string | null>(null);

  const entriesBySupplier = useMemo(() => {
    const map = new Map<string, ImportEntry[]>();
    for (const e of preview?.entries ?? []) {
      const list = map.get(e.party);
      if (list) list.push(e);
      else map.set(e.party, [e]);
    }
    return map;
  }, [preview]);

  const handleError = (err: Error) => {
    const body = isAxiosError(err) ? err.response?.data?.error : undefined;
    const fields = body?.fields as { rows?: ExcelRowError[]; file?: string[] } | undefined;
    if (fields?.rows?.length) setErrors({ rows: fields.rows });
    else if (fields?.file?.length) setErrors({ file: fieldErrorMessage(dict, fields.file[0]!) });
    else setErrors({ general: apiErrorMessage(dict, err) });
  };

  const runPreview = () => {
    if (!file) return;
    setErrors({});
    mutate(
      { file, dryRun: true },
      {
        onSuccess: (result) => {
          setPreview(result);
          setSupplierMarket(Object.fromEntries(result.suppliers.map((s) => [s.name, s.market])));
          setRowMarket({});
          setOpen(null);
        },
        onError: handleError,
      },
    );
  };

  const missing = Object.values(supplierMarket).filter((m) => m === null).length;
  const totalRows = preview?.entries?.length ?? 0;

  const save = () => {
    if (!file || !preview || missing > 0) return;
    const suppliers = supplierMarket as Record<string, Market>;
    // Kirim hanya baris yang memang berbeda dari label suppliernya.
    const rows = Object.fromEntries(
      (preview.entries ?? [])
        .filter((e) => rowMarket[e.key] && rowMarket[e.key] !== suppliers[e.party])
        .map((e) => [e.key, rowMarket[e.key]!]),
    );
    setErrors({});
    mutate(
      { file, dryRun: false, markets: { suppliers, rows } },
      {
        onSuccess: () => {
          onImported(preview.dates[preview.dates.length - 1]!.date);
          onClose();
        },
        onError: handleError,
      },
    );
  };

  // Mengganti label supplier: baris yang sebelumnya disamakan dengan label baru tidak perlu override lagi.
  const changeSupplier = (name: string, market: Market) => {
    const keys = new Set((entriesBySupplier.get(name) ?? []).map((e) => e.key));
    setSupplierMarket((prev) => ({ ...prev, [name]: market }));
    setRowMarket((prev) => Object.fromEntries(Object.entries(prev).filter(([key, m]) => !(keys.has(key) && m === market))));
  };

  const changedRows = (name: string) =>
    (entriesBySupplier.get(name) ?? []).filter((e) => rowMarket[e.key] && rowMarket[e.key] !== supplierMarket[name]).length;

  return (
    <Dialog open onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="flex flex-col gap-4">
            <Field data-invalid={!!errors.file}>
              <FieldLabel htmlFor="journal-file">{t.file}</FieldLabel>
              <Input
                id="journal-file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={isPending}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setErrors({});
                }}
              />
              {errors.file && <FieldError>{errors.file}</FieldError>}
            </Field>
            {errors.rows && (
              <div className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-md border border-destructive/40 p-3 text-sm">
                <p className="font-medium text-destructive">{t.errorsTitle}</p>
                <ul className="list-disc pl-5">
                  {errors.rows.map((row, i) => (
                    <li key={i}>
                      {row.sheet && `${fill(t.sheetRow, { sheet: row.sheet, row: row.row })}: `}
                      {excelRowMessage(dict, row)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {errors.general && <FieldError>{errors.general}</FieldError>}
          </div>
        ) : (
          <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto pr-1">
            {/* Ringkasan per tanggal: cocokkan totalnya dengan laporan staf. */}
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{fill(t.daysTitle, { count: preview.dates.length })}</h3>
              <Table containerClassName="max-h-56 overflow-auto rounded-md border">
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{dict.recap.table.date}</TableHead>
                    <TableHead />
                    <TableHead className="text-right">{tabs.PROCESS}</TableHead>
                    <TableHead className="text-right">{tabs.PACKING}</TableHead>
                    <TableHead className="text-right">{tabs.STOCK}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.dates.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{d.sheet}</TableCell>
                      <TableCell>
                        <Badge variant={d.replaces ? "secondary" : "outline"}>{d.replaces ? t.replaces : t.new}</Badge>
                      </TableCell>
                      {(["PROCESS", "PACKING", "STOCK"] as const).map((s) => (
                        <TableCell key={s} className="text-right tabular-nums">
                          {fmt.kg(d.sections[s].kg)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>

            {/* Label pasar: satu pilihan per supplier, bisa diubah per baris. */}
            <section className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium">{t.suppliersTitle}</h3>
                {missing > 0 && (
                  <span className="text-sm text-amber-700 dark:text-amber-400">{fill(t.missing, { count: missing })}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t.suppliersHint}</p>
              <div className="overflow-hidden rounded-md border">
                {preview.suppliers.map((s) => {
                  const isOpen = open === s.name;
                  const changed = changedRows(s.name);
                  return (
                    <Fragment key={s.name}>
                      <div className="flex items-center gap-2 border-b px-2 py-1.5 last:border-b-0">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpen(isOpen ? null : s.name)}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left text-sm hover:underline"
                        >
                          <ChevronRightIcon className={cn("size-4 shrink-0 transition-transform", isOpen && "rotate-90")} />
                          <span className="truncate font-medium">{s.name}</span>
                          {s.market === null && <Badge variant="outline">{t.newSupplier}</Badge>}
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {fill(dict.journal.rows, { count: s.rows })}
                          </span>
                          {changed > 0 && (
                            <span className="shrink-0 text-xs text-muted-foreground">· {fill(t.rowsChanged, { count: changed })}</span>
                          )}
                        </button>
                        <MarketSelect
                          aria-label={s.name}
                          value={supplierMarket[s.name] ?? null}
                          placeholder={t.choose}
                          onChange={(m) => changeSupplier(s.name, m)}
                        />
                      </div>
                      {isOpen && (
                        <div className="max-h-72 overflow-y-auto border-b bg-muted/30 px-2 py-1 last:border-b-0">
                          <table className="w-full text-xs">
                            <tbody>
                              {(entriesBySupplier.get(s.name) ?? []).map((e) => (
                                <tr key={e.key} className="border-t border-border/50 first:border-t-0">
                                  <td className="py-1 pr-2 whitespace-nowrap tabular-nums">{fmt.dayMonth(e.date)}</td>
                                  <td className="py-1 pr-2 whitespace-nowrap">{tabs[e.section]}</td>
                                  <td className="py-1 pr-2">{e.item}</td>
                                  <td className="py-1 pr-2 text-muted-foreground">{e.size ?? "—"}</td>
                                  <td className="py-1 pr-2 text-right tabular-nums">{fmt.kg(e.kg)}</td>
                                  <td className="py-1 text-right">
                                    <MarketSelect
                                      aria-label={`${s.name} ${e.item} ${e.size ?? ""}`}
                                      className="h-7 text-xs"
                                      value={rowMarket[e.key] ?? supplierMarket[s.name] ?? null}
                                      placeholder={t.choose}
                                      onChange={(m) => setRowMarket((prev) => ({ ...prev, [e.key]: m }))}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </section>
            {errors.general && <FieldError>{errors.general}</FieldError>}
          </div>
        )}

        <DialogFooter>
          {!preview ? (
            <>
              <Button variant="outline" disabled={isPending} onClick={onClose}>
                {t.cancel}
              </Button>
              <Button disabled={isPending || !file} onClick={runPreview}>
                {isPending && <Spinner />}
                {isPending ? t.previewing : t.preview}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={isPending} onClick={() => setPreview(null)}>
                {t.back}
              </Button>
              <Button disabled={isPending || missing > 0} onClick={save}>
                {isPending && <Spinner />}
                {isPending ? t.saving : fill(t.save, { count: totalRows })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportJournalDialog;
