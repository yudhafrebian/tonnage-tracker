import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFormatter } from "@/shared/i18n/use-formatter";
import { format as fill } from "@/shared/i18n/format";
import { AlertTriangleIcon } from "lucide-react";
import React from "react";

interface AlertSectionProps {
  // Tanggal dalam satu bulan yang sama, mis. missingDates atau unpricedDates dari backend.
  dates: string[];
  // Template judul dengan {count}, mis. "{count} tanggal belum ada rekap".
  title: string;
}

// Peringatan berisi daftar tanggal ringkas: "3, 7, 12, 18, 20 Okt".
const AlertSection: React.FC<AlertSectionProps> = ({ dates, title }) => {
  const formatter = useFormatter();

  const days = dates.map((date) => Number(date.slice(8, 10))).join(", ");
  const month = formatter.monthShort(dates[0]!);

  return (
    <Alert className=" border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
      <AlertTriangleIcon />
      <AlertTitle>{fill(title, { count: dates.length })}</AlertTitle>
      <AlertDescription>
        {days} {month}
      </AlertDescription>
    </Alert>
  );
};

export default AlertSection;
