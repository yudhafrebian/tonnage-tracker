import { Skeleton } from "@/components/ui/skeleton";

// Tampil seketika saat pindah halaman di dashboard, sampai isi halaman siap.
// Bentuknya mengikuti pola halaman: kotak judul, deret kartu, lalu tabel/grafik.
export default function DashboardLoading() {
  return (
    <div className="flex w-full flex-col gap-4 p-4 md:p-10" aria-busy="true">
      <Skeleton className="h-20" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
