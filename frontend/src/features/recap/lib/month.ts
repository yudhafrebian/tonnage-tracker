import { addMonths, format, isValid, parse } from "date-fns";
import { intlTag, type Locale } from "@/shared/i18n/config";

// Bulan selalu disimpan sebagai string "yyyy-MM" (sama dengan format backend & query key).
const MONTH_FORMAT = "yyyy-MM";

// "2026-10" -> Date 1 Okt 2026 00:00 jam lokal (tidak bergeser karena zona waktu).
const toDate = (month: string) => parse(month, MONTH_FORMAT, new Date());

// Bulan sekarang menurut jam komputer pengguna, mis. "2026-10".
export const currentMonth = (): string => format(new Date(), MONTH_FORMAT);

// Geser dari bulan yang DIPILIH, bukan dari hari ini.
// shiftMonth("2026-12", 1)  -> "2027-01"
// shiftMonth("2026-01", -1) -> "2025-12"
export const shiftMonth = (month: string, amount: number): string =>
  format(addMonths(toDate(month), amount), MONTH_FORMAT);

// Untuk memvalidasi ?month= dari URL sebelum dipakai.
export const isValidMonth = (value: string | null | undefined): value is string =>
  !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && isValid(toDate(value));

// "2026-10" -> id: "Oktober 2026", en: "October 2026", zh: "2026年10月"
export const formatMonth = (month: string, lang: Locale): string =>
  new Intl.DateTimeFormat(intlTag[lang], { month: "long", year: "numeric" }).format(toDate(month));
