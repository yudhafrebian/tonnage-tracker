import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { DashboardPage } from "@/features/dashboard";

// Suspense wajib dengan cacheComponents: halaman membaca tanggal hari ini (bulan berjalan) dan
// TanStack Query membaca jam saat membuat query, jadi render-nya ditunda ke browser.
const Page = () => {
  return (
    <div className="w-full p-4 md:p-10">
      <Suspense
        fallback={
          <div className="flex justify-center p-6">
            <Spinner />
          </div>
        }
      >
        <DashboardPage />
      </Suspense>
    </div>
  );
};

export default Page;
