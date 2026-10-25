import { isAxiosError } from "axios";
import { format } from "./format";
import { Dictionary } from "./types";

export type ExcelRowError = { row: number; code: string; params: Record<string, string | number>; message: string };

const lookup = (table: Record<string, string>, code: string): string | undefined => table[code];

// Pesan utama dari error axios. Urutan: terjemahan kode → message bahasa Inggris dari backend → umum.
export function apiErrorMessage(dict: Dictionary, error: unknown): string {
  if (isAxiosError(error)) {
    const body = error.response?.data?.error as { code?: string; message?: string } | undefined;
    if (!error.response) return dict.errors.network;
    return (body?.code && lookup(dict.errors, body.code)) ?? body?.message ?? dict.errors.unknown;
  }
  return dict.errors.unknown;
}

// Pesan per field, misalnya fields.file = ["only_xlsx"].
export const fieldErrorMessage = (dict: Dictionary, code: string) =>
  lookup(dict.fieldErrors, code) ?? code;

// Baris error import Excel (fields.rows).
export const excelRowMessage = (dict: Dictionary, e: ExcelRowError) => {
  const template = lookup(dict.excelErrors, e.code);
  return template ? format(template, e.params) : e.message;
};
