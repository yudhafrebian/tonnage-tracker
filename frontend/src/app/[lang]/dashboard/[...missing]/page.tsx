import { notFound } from "next/navigation";

// Path di sini tidak diketahui saat build, sedangkan sidebar & breadcrumb membaca usePathname():
// halaman 404 boleh menunggu (blocking), tidak perlu instan.
export const instant = false;

// Semua URL /dashboard/... yang tidak punya halaman: tampilkan dashboard/not-found.tsx
// di dalam layout dashboard, bukan 404 polos tanpa sidebar.
export default function MissingDashboardPage() {
  notFound();
}
