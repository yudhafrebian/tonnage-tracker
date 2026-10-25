import { PERMISSIONS, can, type Permission, type Role } from "../src/lib/permissions";

const ROLES: Role[] = ["OWNER", "ADMIN", "VIEWER"];
const ALL: Role[] = ["OWNER", "ADMIN", "VIEWER"];
const STAFF: Role[] = ["OWNER", "ADMIN"];
const OWNER: Role[] = ["OWNER"];

const EXPECTED: Record<Permission, Role[]> = {
  "recap:read": ALL,
  "recap:write": STAFF,
  "finance:read": STAFF,
  "expense:read": STAFF,
  "expense:write": STAFF,
  "price-rate:read": STAFF,
  "price-rate:write": OWNER,
  "audit-log:read": OWNER,
};

describe("matriks izin", () => {
  it("tidak ada izin yang terlewat atau berlebih", () => {
    expect(Object.keys(PERMISSIONS).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  describe.each(Object.keys(EXPECTED) as Permission[])("%s", (permission) => {
    it.each(ROLES)("role %s", (role) => {
      expect(can(role, permission)).toBe(EXPECTED[permission].includes(role));
    });
  });

  it("Viewer hanya bisa membaca rekap", () => {
    for (const p of Object.keys(PERMISSIONS) as Permission[]) {
      expect(can("VIEWER", p)).toBe(p === "recap:read");
    }
  });

  it("Admin tidak bisa mengelola tarif atau melihat audit log", () => {
    expect(can("ADMIN", "price-rate:write")).toBe(false);
    expect(can("ADMIN", "audit-log:read")).toBe(false);
  });
});
