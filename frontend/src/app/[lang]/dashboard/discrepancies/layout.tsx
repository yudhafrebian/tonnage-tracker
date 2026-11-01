import { RequirePermission } from "@/features/auth";

// Halaman ini sengaja menunggu role user (/auth/me) sebelum tampil,
// jadi dikeluarkan dari validasi instant navigation.
export const instant = false;

export default function DiscrepanciesLayout({ children }: LayoutProps<"/[lang]/dashboard/discrepancies">) {
  return <RequirePermission permission="journal:read">{children}</RequirePermission>;
}
