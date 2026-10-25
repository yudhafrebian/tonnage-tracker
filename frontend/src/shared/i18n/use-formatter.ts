"use client";

import { useMemo } from "react";
import { intlTag } from "./config";
import { useI18n } from "./i18n-provider";

export type Formatter = ReturnType<typeof useFormatter>;

export function useFormatter() {
  const { lang } = useI18n();
  return useMemo(() => {
    const tag = intlTag[lang];
    // 2 desimal: sama dengan presisi yang disimpan backend (Decimal(12, 2)).
    const kg = new Intl.NumberFormat(tag, { maximumFractionDigits: 2 });
    const rupiah = new Intl.NumberFormat(tag, { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
    const amount = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
    const compact = new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 });
    const percent = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 });
    const date = new Intl.DateTimeFormat(tag, { dateStyle: "long" });
    const dateTime = new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" });
    const monthShort = new Intl.DateTimeFormat(tag, { month: "short" });
    const dayMonth = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short" });
    // Backend kirim "2026-10-20"; tambah jam lokal agar tidak mundur sehari karena zona waktu.
    const toDate = (iso: string) => new Date(`${iso}T00:00:00`);
    return {
      kg: (n: number) => kg.format(n),                // id: 23.711,4   en: 23,711.4
      rupiah: (n: number) => rupiah.format(n),        // id: Rp 1.500.000
      // Rupiah tanpa simbol, untuk tabel yang judul kolomnya sudah "(Rp)". id: 1.500.000
      amount: (n: number) => amount.format(n),
      // Sumbu grafik & kartu: id: "1,2 jt", en: "1.2M"
      compact: (n: number) => compact.format(n),
      // Angka persen tanpa simbol, mis. 8,2 (id) / 8.2 (en)
      percent: (n: number) => percent.format(n),
      date: (iso: string) => date.format(toDate(iso)),
      // Timestamp lengkap dari backend (createdAt), ditampilkan dalam jam lokal. id: "24 Okt 2026, 09.13"
      dateTime: (iso: string) => dateTime.format(new Date(iso)),
      monthShort: (iso: string) => monthShort.format(toDate(iso)),
      // id: "20 Okt", en: "Oct 20", zh: "10月20日"
      dayMonth: (iso: string) => dayMonth.format(toDate(iso)),
    };
  }, [lang]);
}
