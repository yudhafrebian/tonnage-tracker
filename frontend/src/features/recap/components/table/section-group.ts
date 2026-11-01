import { createColumnHelper, type RowData } from "@tanstack/react-table";
import { SECTIONS, type RecapGrouping, type Section, type SectionName } from "@/features/recap/types/types";
import type { Dictionary } from "@/shared/i18n/types";
import type { Formatter } from "@/shared/i18n/use-formatter";
import { format as fill } from "@/shared/i18n/format";
import type { DataTableFeatures } from "./data-table-features";

const PARTS: (keyof Section)[] = ["total", "export", "local"];
// Per pasar: Ekspor & Lokal dulu (seperti sheet REKAP Excel), Total di belakang.
const MARKET_PARTS: (keyof Section)[] = ["export", "local", "total"];

// Kolom kg dalam grup. Dipakai tabel harian (baris = RecapDay) dan tahunan (baris = MonthSummary);
// `getSection` menentukan cara mengambil section dari satu baris.
//   section: "Proses (kg)" -> Total | Ekspor | Lokal, lalu Packing, lalu Sisa.
//   market:  "Ekspor (kg)" -> Proses | Packing | Sisa, lalu Lokal, lalu Total (susunan Excel admin).
// ID kolom selalu `${section}.${part}` di kedua susunan, jadi hiddenColumns & footer tetap berlaku.
export const makeKgGroups = <TData extends RowData>(
  getSection: (row: TData, section: SectionName) => Section | null | undefined,
  t: Dictionary["recap"],
  fmt: Formatter,
  grouping: RecapGrouping,
) => {
  const columnHelper = createColumnHelper<DataTableFeatures, TData>();
  const kg = (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : fmt.kg(value);

  const leaf = (section: SectionName, part: keyof Section, header: string) =>
    columnHelper.accessor((row) => getSection(row, section)?.[part] ?? null, {
      id: `${section}.${part}`,
      header,
      cell: (info) => kg(info.getValue()),
      // Total dari backend, bukan dijumlah di sini: sisa tidak dijumlah
      // (pakai sisa tanggal terakhir yang diisi) dan backend menghitung pakai Decimal.
      footer: ({ table }) => kg(table.options.meta?.total[section]?.[part]),
    });

  if (grouping === "market") {
    return MARKET_PARTS.map((part) =>
      columnHelper.group({
        id: `market.${part}`,
        header: fill(t.table.kgGroup, { section: t.parts[part] }),
        columns: columnHelper.columns(SECTIONS.map((section) => leaf(section, part, t.sections[section]))),
      }),
    );
  }
  return SECTIONS.map((section) =>
    columnHelper.group({
      id: section,
      header: fill(t.table.kgGroup, { section: t.sections[section] }),
      columns: columnHelper.columns(PARTS.map((part) => leaf(section, part, t.parts[part]))),
    }),
  );
};
