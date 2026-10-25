import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/shared/components/appbar/app-sidebar";
import Header from "@/shared/components/appbar/header";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* min-w-0: tanpa ini, isi yang lebar (tabel rekap) memaksa <main> melebar keluar layar
          alih-alih di-scroll di dalam tabelnya sendiri. */}
      <SidebarInset className="min-w-0">
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
