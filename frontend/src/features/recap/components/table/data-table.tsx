"use client";

import {
  flexRender,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { cn } from "cn";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  features,
  type DataTableFeatures,
  type RecapTableMeta,
} from "./data-table-features";

// Dipakai tabel harian (columns dari column.tsx) dan tahunan (yearly-column.tsx).
export function RecapTable<TData extends RowData>({
  data,
  columns,
  total,
  onRowClick,
  onAction,
  hiddenColumns = [],
}: {
  data: TData[];
  columns: ColumnDef<DataTableFeatures, TData, unknown>[];
  total: RecapTableMeta["total"];
  // Mis. klik baris bulan di tab Tahunan -> buka bulan itu.
  onRowClick?: (row: TData) => void;
  onAction?: RecapTableMeta["onAction"];
  // Id kolom yang disembunyikan, mis. kolom keuangan untuk VIEWER.
  // Header grup ikut hilang kalau semua kolom anaknya disembunyikan.
  hiddenColumns?: string[];
}) {
  const table = useTable({
    features,
    columns,
    data,
    meta: { total, onAction },
    state: {
      columnVisibility: Object.fromEntries(hiddenColumns.map((id) => [id, false])),
    },
  });
  // getFooterGroups() terbalik dari header: [0] = baris kolom daun (Total/Ekspor/Lokal).
  // Baris footer untuk grup (Proses/Packing/Sisa) tidak dipakai.
  const footerGroup = table.getFooterGroups()[0];

  // Kolom pertama (Tanggal / Bulan) dibekukan: tetap terlihat saat tabel digeser horizontal.
  const frozenColumnId = table.getAllLeafColumns()[0]?.id;
  // bg wajib: tanpa latar, angka yang lewat di bawahnya terlihat menembus.
  // shadow tipis di kanan sebagai penanda ada kolom yang tersembunyi di bawahnya.
  const frozen = (columnId: string, bg: string) =>
    columnId === frozenColumnId &&
    cn("sticky left-0 z-[1] shadow-[1px_0_0_var(--border)]", bg);

  // Batas antar grup (Tanggal | Proses | Packing | Sisa | Keuangan | ...) dipertebal supaya
  // kolom Total/Ekspor/Lokal milik section yang berbeda mudah dibedakan.
  // Kolom terakhir dilewati karena sudah tertutup border container.
  const leaves = table.getVisibleLeafColumns();
  const groupEdges = new Set(
    leaves
      .filter((col, i) => i < leaves.length - 1 && col.parent?.id !== leaves[i + 1]!.parent?.id)
      .map((col) => col.id),
  );
  const edge = (columnId: string | undefined) =>
    columnId !== undefined && groupEdges.has(columnId) && "border-r-2 border-r-foreground/25";

  return (
    // Container tabel jadi area scroll (tinggi dibatasi) supaya header sticky menempel di sini.
    // border-separate: dengan border-collapse, border sel sticky ikut tergulung hilang.
    <Table
      containerClassName="max-h-[calc(100svh-10rem)] overflow-auto rounded-md border"
      className="border-separate border-spacing-0"
    >
      <TableHeader className="sticky top-0 z-10">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header) =>
              // rowSpan 0 = sudah tertutup sel di atasnya (mis. "Tanggal" yang membentang 2 baris)
              header.rowSpan === 0 ? null : (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan} // "Proses" membentang 3 kolom
                  rowSpan={header.rowSpan} // "Tanggal" membentang 2 baris
                  // bg wajib: tanpa latar, isi tabel terlihat menembus header saat di-scroll.
                  className={cn(
                    "border-r border-b bg-muted text-center",
                    // Header grup ("Proses") mengikuti kolom daun terakhirnya ("Lokal").
                    // getLeafHeaders() ikut menyertakan header itu sendiri di akhir, jadi disaring.
                    edge(
                      header
                        .getLeafHeaders()
                        .filter((h) => h.subHeaders.length === 0)
                        .at(-1)?.column.id,
                    ),
                    frozen(header.column.id, "bg-muted"),
                  )}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ),
            )}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            onClick={onRowClick && (() => onRowClick(row.original))}
            className={cn("group/row", onRowClick && "cursor-pointer")}
          >
            {/* getVisibleCells, bukan getAllCells: kolom yang disembunyikan (keuangan untuk
                VIEWER) tidak boleh ikut dirender, kalau tidak sel bergeser dari header-nya. */}
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn(
                  "border-r border-b text-right",
                  edge(cell.column.id),
                  // Ikut warna hover baris; tanpa ini sel beku tetap putih saat baris di-hover.
                  frozen(
                    cell.column.id,
                    "bg-background text-center font-medium group-hover/row:bg-muted",
                  ),
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      {footerGroup && (
        // Sticky di bawah, sama seperti header di atas.
        <TableFooter className="sticky bottom-0 z-10">
          <TableRow className="hover:bg-transparent">
            {footerGroup.headers.map((footer) => (
              <TableCell
                key={footer.id}
                className={cn(
                  "border-t border-r bg-muted text-right font-semibold",
                  edge(footer.column.id),
                  frozen(footer.column.id, "bg-muted text-center"),
                )}
              >
                {flexRender(
                  footer.column.columnDef.footer,
                  footer.getContext(),
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
