import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { SettingsPage } from "@/features/settings";

// useSearchParams (?tab=) hanya diketahui saat request, jadi dibungkus Suspense.
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
        <SettingsPage />
      </Suspense>
    </div>
  );
};

export default Page;
