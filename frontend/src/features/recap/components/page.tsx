"use client";
import { useState } from "react";
import ToolbarHeader from "./toolbar-header";
import { currentMonth } from "../lib/month";
import type { DialogState, RecapView } from "../types/types";
import MonthlyView from "./monthly-view";
import YearlyView from "./yearly-view";
import DialogManagement from "./dialog-management";

const RecapPage = () => {
  const [month, setMonth] = useState(currentMonth);
  const [view, setView] = useState<RecapView>("monthly");
  // Dipegang di sini: tombol "Tambah Data" di toolbar dan kolom Aksi di tabel membuka dialog yang sama.
  const [dialog, setDialog] = useState<DialogState>({ type: null });
  // Tahun diturunkan dari bulan, bukan state sendiri, supaya keduanya tidak pernah beda.
  const year = month.slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      <ToolbarHeader
        view={view}
        onViewChange={setView}
        month={month}
        onMonthChange={setMonth}
        onOpenDialog={(type) => setDialog({ type })}
      />
      {view === "monthly" ? (
        <MonthlyView month={month} onAction={(type, date) => setDialog({ type, date })} />
      ) : (
        <YearlyView
          year={year}
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
