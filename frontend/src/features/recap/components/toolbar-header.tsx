import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import MonthSelector from "./month-selector";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import { ChevronDown, Download, Plus, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/shared/i18n/i18n-provider";
import { formatMonth } from "../lib/month";
import { DialogType, RecapView } from "../types/types";
import { useExportRecapMutation } from "../api/recap.query";
import { usePermission } from "@/features/auth";

interface ToolbarHeaderProps {
  view: RecapView;
  onViewChange: (view: RecapView) => void;
  month: string; // "2026-10"; di tab Tahunan yang dipakai hanya tahunnya
  onMonthChange: (month: string) => void;
  // State dialog dipegang page, karena kolom Aksi di tabel juga membuka dialog yang sama.
  onOpenDialog: (type: Exclude<DialogType, null>) => void;
}

const ToolbarHeader: React.FC<ToolbarHeaderProps> = (props) => {
  const { mutate: exportRecap, isPending: isExporting } = useExportRecapMutation();
  // Tambah & Import butuh recap:write; Export boleh semua role (backend: recap:read).
  const { allowed: canWrite } = usePermission("recap:write");
  // Backend hanya punya export bulanan, jadi di tab Tahunan dinonaktifkan.
  const exportDisabled = isExporting || props.view !== "monthly";

  const { lang, dict } = useI18n();
  const t = dict.recap;
  const periodLabel =
    props.view === "monthly" ? formatMonth(props.month, lang) : props.month.slice(0, 4);

  return (
    <>
      {/* HP: ditumpuk; sm ke atas: judul+tab di kiri, navigasi bulan+aksi di kanan. */}
      <div className="flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold md:text-3xl">
            {t.title} {periodLabel}
          </h1>
          {/* value + onValueChange (bukan defaultValue): state tab dipegang page. */}
          <Tabs
            value={props.view}
            onValueChange={(value) => props.onViewChange(value as RecapView)}
          >
            <TabsList>
              <TabsTrigger value="monthly">{t.monthly}</TabsTrigger>
              <TabsTrigger value="yearly">{t.yearly}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start">
          {/* Tahunan: geser 12 bulan per klik = pindah tahun, bulan tetap diingat. */}
          <MonthSelector
            value={props.month}
            onChange={props.onMonthChange}
            label={periodLabel}
            step={props.view === "monthly" ? 1 : 12}
          />
          {canWrite ? (
            <ButtonGroup>
              <Button onClick={() => props.onOpenDialog("create")}>
                <Plus />
                {t.addData}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button size={"icon"} aria-label={t.moreActions}>
                      <ChevronDown />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className={"w-40"}>
                  <DropdownMenuItem
                    disabled={exportDisabled}
                    onClick={() => exportRecap(props.month)}
                  >
                    <Download />
                    {isExporting ? t.exporting : t.exportExcel}
                  </DropdownMenuItem>
                  {/* Import selalu ke satu bulan, jadi hanya di tab Bulanan (sama seperti Export). */}
                  <DropdownMenuItem
                    disabled={props.view !== "monthly"}
                    onClick={() => props.onOpenDialog("import")}
                  >
                    <Upload />
                    {t.import}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          ) : (
            // VIEWER: hanya Export (tanpa kolom & sheet keuangan, diatur backend).
            <Button
              variant="outline"
              disabled={exportDisabled}
              onClick={() => exportRecap(props.month)}
            >
              <Download />
              {isExporting ? t.exporting : t.exportExcel}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default ToolbarHeader;
