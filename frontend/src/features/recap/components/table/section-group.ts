import { createColumnHelper, type RowData } from "@tanstack/react-table";
import type { Section, SectionName } from "@/features/recap/types/types";
import type { Dictionary } from "@/shared/i18n/types";
import type { Formatter } from "@/shared/i18n/use-formatter";
import { format as fill } from "@/shared/i18n/format";
import type { DataTableFeatures } from "./data-table-features";

const PARTS: (keyof Section)[] = ["total", "export", "local"];

// Header grup (mis. "Proses (kg)") dengan 3 sub-header: Total, Ekspor, Lokal.
// Dipakai tabel harian (baris = RecapDay) dan tahunan (baris = MonthSummary);
// `getSection` menentukan cara mengambil section dari satu baris.
export const makeSectionGroup = <TData extends RowData>(
  getSection: (row: TData, section: SectionName) => Section | null | undefined,
  t: Dictionary["recap"],
  fmt: Formatter,
) => {
  const columnHelper = createColumnHelper<DataTableFeatures, TData>();
  const kg = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : fmt.kg(value);

  return (section: SectionName) =>
    columnHelper.group({
      id: section,
      header: fill(t.table.kgGroup, { section: t.sections[section] }),
      columns: columnHelper.columns(
        PARTS.map((part) =>
          columnHelper.accessor((row) => getSection(row, section)?.[part] ?? null, {
            id: `${section}.${part}`,
            header: t.parts[part],
            cell: (info) => kg(info.getValue()),
            // Total dari backend, bukan dijumlah di sini: sisa tidak dijumlah
            // (pakai sisa tanggal terakhir yang diisi) dan backend menghitung pakai Decimal.
            footer: ({ table }) => kg(table.options.meta?.total[section]?.[part]),
          }),
        ),
      ),
    });
};
