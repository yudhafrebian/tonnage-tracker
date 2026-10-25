import { RequirePermission } from "@/features/auth";

// Halaman ini sengaja menunggu role user (/auth/me) sebelum tampil,
// jadi dikeluarkan dari validasi instant navigation.
export const instant = false;

export default function RecapLayout({ children }: LayoutProps<"/[lang]/dashboard/recap">) {
  return <RequirePermission permission="recap:read">{children}</RequirePermission>;
}