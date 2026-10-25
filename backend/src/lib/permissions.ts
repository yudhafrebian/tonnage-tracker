export type Role = "OWNER" | "ADMIN" | "VIEWER";

const ALL: readonly Role[] = ["OWNER", "ADMIN", "VIEWER"];
const STAFF: readonly Role[] = ["OWNER", "ADMIN"];
const OWNER: readonly Role[] = ["OWNER"];

export const PERMISSIONS = {
  "recap:read": ALL,
  "recap:write": STAFF,
  // Harga per kg dan pemasukan. VIEWER hanya melihat kg.
  "finance:read": STAFF,
  "expense:read": STAFF,
  "expense:write": STAFF,
  "price-rate:read": STAFF,
  "price-rate:write": OWNER,
  "audit-log:read": OWNER,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;
export const can = (role: Role, permission: Permission): boolean =>
  PERMISSIONS[permission].includes(role);
