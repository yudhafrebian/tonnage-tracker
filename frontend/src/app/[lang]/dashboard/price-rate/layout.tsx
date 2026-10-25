import { RequirePermission } from "@/features/auth";

// Halaman ini sengaja menunggu role user (/auth/me) sebelum tampil,
// jadi dikeluarkan dari validasi instant navigation.
export const instant = false;

export default function PriceRateLayout({ children }: LayoutProps<"/[lang]/dashboard/price-rate">) {
  return <RequirePermission permission="price-rate:read">{children}</RequirePermission>;
}
