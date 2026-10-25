"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { Download } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { useDownloadImportTemplateMutation, useImportRecapMutation } from "../api/recap.query";
import { formatMonth } from "../lib/month";
import type { ImportAction, ImportConflict, ImportResult } from "../types/types";

interface ImportRecapDialogProps {
  month: string; // "2026-10": bulan yang sedang dibuka di halaman
  onClose: () => void;
}

const ACTION_VARIANT: Record<ImportAction, "default" | "secondary" | "outline"> = {
  create: "default",
  update: "secondary",
  skip: "outline",
  unchanged: "outline",
};

type ImportErrors = { rows?: ExcelRowError[]; file?: string; general?: string };

// Dua langkah: pilih file -> Pratinjau (dryRun, tidak menyimpan) -> Simpan.
// Backend menyimpan semua tanggal dalam satu transaksi: kalau ada yang gagal, tidak ada yang tersimpan.
const ImportRecapDialog = ({ month, onClose }: ImportRecapDialogProps) => {
  const { dict, lang } = useI18n();
  const t = dict.recap.importDialog;
  const fmt = useFormatter();
  const { mutate, isPending } = useImportRecapMutation();
  const { mutate: downloadTemplate, isPending: isDownloadingTemplate } =
    useDownloadImportTemplateMutation();

  const [file, setFile] = useState<File | null>(null);
  const [onConflict, setOnConflict] = useState<ImportConflict>("skip");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [errors, setErrors] = useState<ImportErrors>({});

  const run = (dryRun: boolean) => {
    if (!file) {
      setErrors({ file: fieldErrorMessage(dict, "file_required") });
      return;
    }
    setErrors({});
    mutate(
      { month, file, dryRun, onConflict },
      {
        onSuccess: (result) => (dryRun ? setPreview(result) : onClose()),
        onError: (err) => {
          const body = isAxiosError(err) ? err.response?.data?.error : undefined;
          const fields = body?.fields as { rows?: ExcelRowError[]; file?: string[] } | undefined;
          setPreview(null);
          if (fields?.rows?.length) {
            // import_invalid: daftar kesalahan per baris Excel.
            setErrors({ rows: fields.rows });
          } else if (fields?.file?.length) {
            // only_xlsx / invalid_xlsx / file_too_large / file_required.
            setErrors({ file: fieldErrorMessage(dict, fields.file[0]!) });
          } else {
            setErrors({ general: apiErrorMessage(dict, err) });
          }
        },
      },
    );
  };

  const toSave = preview ? preview.summary.create + preview.summary.update : 0;

  return (
    <Dialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{fill(t.title, { month: formatMonth(month, lang) })}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        {!preview ? (
          // Langkah 1: pilih file & aturan bentrok.
          <div className="flex flex-col gap-4">
            <Field data-invalid={!!errors.file}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="import-file">{t.file}</FieldLabel>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  disabled={isPending || isDownloadingTemplate}
                  onClick={() => downloadTemplate(month)}
                >
                  {isDownloadingTemplate ? <Spinner /> : <Download />}
                  {t.downloadTemplate}
                </Button>
              </div>
              <Input
                id="import-file"
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

            <Field>
              <FieldLabel>{t.onConflict}</FieldLabel>
              <RadioGroup
                value={onConflict}
                onValueChange={(value) => setOnConflict(value as ImportConflict)}
                disabled={isPending}
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="skip" />
                  {t.skip}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="overwrite" />
                  {t.overwrite}
                </label>
              </RadioGroup>
            </Field>

            {errors.rows && (
              <div className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-md border border-destructive/40 p-3 text-sm">
                <p className="font-medium text-destructive">{t.errorsTitle}</p>
                <ul className="list-disc pl-5">
                  {errors.rows.map((row, i) => (
                    <li key={i}>
                      {row.row > 0 && `${fill(t.row, { row: row.row })}: `}
                      {excelRowMessage(dict, row)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {errors.general && <FieldError>{errors.general}</FieldError>}
          </div>
        ) : (
          // Langkah 2: pratinjau hasil (belum ada yang disimpan).
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{fill(t.sheet, { sheet: preview.sheet })}</span>
              {(Object.keys(ACTION_VARIANT) as ImportAction[]).map((action) => (
                <Badge key={action} variant={ACTION_VARIANT[action]}>
                  {t.actions[action]}: {preview.summary[action]}
                </Badge>
              ))}
            </div>

            <Table containerClassName="max-h-72 overflow-auto rounded-md border">
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{dict.recap.table.date}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead className="text-right">{dict.recap.sections.process}</TableHead>
                  <TableHead className="text-right">{dict.recap.sections.packing}</TableHead>
                  <TableHead className="text-right">{dict.recap.sections.stock}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{Number(row.date.slice(8, 10))}</TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[row.action]}>{t.actions[row.action]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmt.kg(row.process.total)}</TableCell>
                    <TableCell className="text-right">{fmt.kg(row.packing.total)}</TableCell>
                    <TableCell className="text-right">{fmt.kg(row.stock.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {toSave === 0 && <p className="text-sm text-muted-foreground">{t.nothingToSave}</p>}
            {errors.general && <FieldError>{errors.general}</FieldError>}
          </div>
        )}

        <DialogFooter>
          {!preview ? (
            <>
              <Button variant="outline" disabled={isPending} onClick={onClose}>
                {dict.recap.form.cancel}
              </Button>
              <Button disabled={isPending || !file} onClick={() => run(true)}>
                {isPending && <Spinner />}
                {isPending ? t.previewing : t.preview}
              </Button>
            </>
          ) : (
            <>
              {/* Kembali untuk ganti file atau aturan bentrok (perlu pratinjau ulang). */}
              <Button variant="outline" disabled={isPending} onClick={() => setPreview(null)}>
                {t.back}
              </Button>
              <Button disabled={isPending || toSave === 0} onClick={() => run(false)}>
                {isPending && <Spinner />}
                {isPending ? dict.recap.form.saving : fill(t.save, { count: toSave })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportRecapDialog;
