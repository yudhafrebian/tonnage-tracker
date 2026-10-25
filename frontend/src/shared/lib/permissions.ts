export type Role = "OWNER" | "ADMIN" | "VIEWER";
const ALL: readonly Role[] = ["OWNER", "ADMIN", "VIEWER"];
const STAFF: readonly Role[] = ["OWNER", "ADMIN"];
const OWNER: readonly Role[] = ["OWNER"];

export const PERMISSIONS = {
  "recap:read": ALL,
  "recap:write": STAFF,
  "finance:read": STAFF,
  "expense:read": STAFF,
  "expense:write": STAFF,
  "price-rate:read": STAFF,
  "price-rate:write": OWNER,
  "audit-log:read": OWNER,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;
export const can = (role: Role | undefined, p: Permission) =>
  !!role && PERMISSIONS[p].includes(role);
