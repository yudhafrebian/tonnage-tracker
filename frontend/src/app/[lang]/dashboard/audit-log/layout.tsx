import { RequirePermission } from "@/features/auth";

// Halaman ini sengaja menunggu role user (/auth/me) sebelum tampil,
// jadi dikeluarkan dari validasi instant navigation.
export const instant = false;

export default function AuditLogLayout({ children }: LayoutProps<"/[lang]/dashboard/audit-log">) {
  return <RequirePermission permission="audit-log:read">{children}</RequirePermission>;
}
