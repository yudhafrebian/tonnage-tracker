import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ProfileButton } from "@/features/auth";
import Breadcrumb from "./breadcrumb";

const Header = () => {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b bg-background py-3 pr-4 pl-2 md:pr-8">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4!" />
        {/* Breadcrumb membaca usePathname() (hanya diketahui saat request). */}
        <Suspense>
          <Breadcrumb />
        </Suspense>
      </div>
      <ProfileButton />
    </header>
  );
};

export default Header;
