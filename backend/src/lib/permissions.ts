export type Role = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "VIEWER";

// SUPER_ADMIN ikut di setiap kelompok yang memuat OWNER: hak aksesnya sama kuat.
const ALL: readonly Role[] = ["SUPER_ADMIN", "OWNER", "ADMIN", "VIEWER"];
const STAFF: readonly Role[] = ["SUPER_ADMIN", "OWNER", "ADMIN"];
const OWNER: readonly Role[] = ["SUPER_ADMIN", "OWNER"];

// Role yang tidak boleh muncul di daftar akun / manajemen user (dan tidak bisa diubah dari sana).
// Wajib dipakai sebagai filter saat fitur daftar user dibuat.
export const HIDDEN_ROLES: readonly Role[] = ["SUPER_ADMIN"];

export const PERMISSIONS = {
  "recap:read": ALL,
  "recap:write": STAFF,
  // Harga per kg dan pemasukan. VIEWER hanya melihat kg.
  "finance:read": STAFF,
  "expense:read": STAFF,
  "expense:write": STAFF,
  "price-rate:read": STAFF,
  "price-rate:write": OWNER,
  // Jurnal harian (rincian per supplier). Semua role boleh melihat, seperti rekap.
  "journal:read": ALL,
  "journal:write": STAFF,
  "audit-log:read": OWNER,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;
export const can = (role: Role, permission: Permission): boolean =>
  PERMISSIONS[permission].includes(role);
