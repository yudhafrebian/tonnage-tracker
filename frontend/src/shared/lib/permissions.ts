export type Role = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "VIEWER";
// SUPER_ADMIN ikut di setiap kelompok yang memuat OWNER: hak aksesnya sama kuat (sama dengan backend).
const ALL: readonly Role[] = ["SUPER_ADMIN", "OWNER", "ADMIN", "VIEWER"];
const STAFF: readonly Role[] = ["SUPER_ADMIN", "OWNER", "ADMIN"];
const OWNER: readonly Role[] = ["SUPER_ADMIN", "OWNER"];

// Role yang tidak boleh muncul di daftar akun / manajemen user. Pakai sebagai filter saat fitur itu dibuat.
export const HIDDEN_ROLES: readonly Role[] = ["SUPER_ADMIN"];

export const PERMISSIONS = {
  "recap:read": ALL,
  "recap:write": STAFF,
  "finance:read": STAFF,
  "expense:read": STAFF,
  "expense:write": STAFF,
  "price-rate:read": STAFF,
  "price-rate:write": OWNER,
  "journal:read": ALL,
  "journal:write": STAFF,
  "audit-log:read": OWNER,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;
export const can = (role: Role | undefined, p: Permission) =>
  !!role && PERMISSIONS[p].includes(role);
