import { RequirePermission } from "@/features/auth";

// Halaman ini sengaja menunggu role user (/auth/me) sebelum tampil,
// jadi dikeluarkan dari validasi instant navigation.
export const instant = false;

export default function ExpenseLayout({ children }: LayoutProps<"/[lang]/dashboard/expense">) {
  return <RequirePermission permission="expense:read">{children}</RequirePermission>;
}
