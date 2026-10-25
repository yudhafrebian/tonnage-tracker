import {
  columnVisibilityFeature,
  metaHelper,
  tableFeatures,
} from "@tanstack/react-table"
import type { DialogType, MonthlyRecap } from "../../types/types"

// Data tambahan yang bisa dibaca kolom lewat table.options.meta.
export type RecapTableMeta = {
  // Footer TOTAL. recordedDays/missingDays hanya ada di total tahunan.
  total: MonthlyRecap["total"] & { recordedDays?: number; missingDays?: number }
  // Kolom Aksi: buka dialog tambah/edit/hapus untuk tanggal tertentu.
  onAction?: (type: Exclude<DialogType, null>, date: string) => void
}

// v9: hanya fitur yang didaftarkan yang ikut di-bundle.
// Tabel rekap selalu 28–31 baris (satu per tanggal) dan urut tanggal dari backend,
// jadi tidak perlu pagination (default pageSize 10 akan memotong tanggal 11+),
// sorting, filter, atau row selection. Tambahkan lagi kalau memang dibutuhkan.
export const features = tableFeatures({
  // Untuk menyembunyikan grup kolom keuangan bagi VIEWER nanti.
  columnVisibilityFeature,
  // Hanya untuk tipe (dibuang saat runtime).
  tableMeta: metaHelper<RecapTableMeta>(),
})

// Pass this as the first generic argument to `ColumnDef`, `Column`, `Table`,
// and `Row` so each type knows which feature APIs are available.
export type DataTableFeatures = typeof features
