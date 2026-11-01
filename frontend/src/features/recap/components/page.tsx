"use client";
import { useState } from "react";
import ToolbarHeader from "./toolbar-header";
import { currentMonth } from "../lib/month";
import type { DialogState, RecapGrouping, RecapView } from "../types/types";
import MonthlyView from "./monthly-view";
import YearlyView from "./yearly-view";
import DialogManagement from "./dialog-management";

const GROUPING_KEY = "recap-grouping";

// Susunan kolom terakhir yang dipilih di browser ini (kenyamanan saja; gagal baca = per bagian).
const readGrouping = (): RecapGrouping => {
  try {
    return localStorage.getItem(GROUPING_KEY) === "market" ? "market" : "section";
  } catch {
    return "section";
  }
};

const RecapPage = () => {
  const [month, setMonth] = useState(currentMonth);
  const [view, setView] = useState<RecapView>("monthly");
  // Halaman ini baru dirender di browser setelah role user diketahui (RequirePermission),
  // jadi aman membaca localStorage saat inisialisasi.
  const [grouping, setGrouping] = useState<RecapGrouping>(readGrouping);
  // Dipegang di sini: tombol "Tambah Data" di toolbar dan kolom Aksi di tabel membuka dialog yang sama.
  const [dialog, setDialog] = useState<DialogState>({ type: null });
  // Tahun diturunkan dari bulan, bukan state sendiri, supaya keduanya tidak pernah beda.
  const year = month.slice(0, 4);

  const changeGrouping = (next: RecapGrouping) => {
    setGrouping(next);
    try {
      localStorage.setItem(GROUPING_KEY, next);
    } catch {
      // Penyimpanan diblokir: pilihan tetap berlaku sampai halaman ditutup.
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ToolbarHeader
        view={view}
        onViewChange={setView}
        grouping={grouping}
        onGroupingChange={changeGrouping}
        month={month}
        onMonthChange={setMonth}
        onOpenDialog={(type) => setDialog({ type })}
      />
      {view === "monthly" ? (
        <MonthlyView month={month} grouping={grouping} onAction={(type, date) => setDialog({ type, date })} />
      ) : (
        <YearlyView
          year={year}
          grouping={grouping}
          onPickMonth={(picked) => {
            setMonth(picked);
            setView("monthly");
          }}
        />
      )}
      <DialogManagement
        dialog={dialog}
        month={month}
        onClose={() => setDialog({ type: null })}
      />
    </div>
  );
};

export default RecapPage;
