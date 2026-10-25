import type { Dictionary } from "@/shared/i18n/types";
import { Permission } from "@/shared/lib/permissions";
import {
  Book,
  DollarSign,
  HistoryIcon,
  LayoutDashboard,
  Settings,
  TrendingDown,
} from "lucide-react";

export type NavItem = {
  key: keyof Dictionary["nav"];
  href: string;
  icon: React.ReactNode;
  permission?: Permission;
};

// Menu data (bagian atas sidebar).
export const navigation: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: <LayoutDashboard /> },
  { key: "recap", href: "/dashboard/recap", icon: <Book />, permission: "recap:read" },
  { key: "expense", href: "/dashboard/expense", icon: <TrendingDown />, permission: "expense:read" },
  { key: "priceRate", href: "/dashboard/price-rate", icon: <DollarSign />, permission: "price-rate:read" },
  { key: "auditLog", href: "/dashboard/audit-log", icon: <HistoryIcon />, permission: "audit-log:read" },
];

// Menu akun/sistem (bagian bawah sidebar), terpisah dari menu data.
export const footerNavigation: NavItem[] = [
  { key: "settings", href: "/dashboard/settings", icon: <Settings /> },
];

// "/dashboard/expense/..." -> item Pengeluaran. Dashboard hanya cocok persis,
// karena semua halaman lain juga diawali "/dashboard".
export const isNavActive = (href: string, pathname: string) =>
  href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
