import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { shiftMonth } from "../lib/month";
import { useI18n } from "@/shared/i18n/i18n-provider";

interface MonthSelectorProps {
  value: string; // "2026-10"
  onChange: (value: string) => void;
  label: string; // teks di tengah, mis. "Oktober 2026" atau "2026"
  step?: number; // jumlah bulan per klik: 1 (Bulanan) atau 12 (Tahunan)
}

const MonthSelector: React.FC<MonthSelectorProps> = ({ value, onChange, label, step = 1 }) => {
  const t = useI18n().dict.recap;

  return (
    <div className="flex items-center gap-2">
      <Button size={"icon"} variant={"outline"} aria-label={t.previous} onClick={() => onChange(shiftMonth(value, -step))}>
        <ChevronLeft />
      </Button>
      <p className="min-w-32 text-center">{label}</p>
      <Button size={"icon"} variant={"outline"} aria-label={t.next} onClick={() => onChange(shiftMonth(value, step))}>
        <ChevronRight />
      </Button>
    </div>
  );
};

export default MonthSelector;
