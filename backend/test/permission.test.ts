import { HIDDEN_ROLES, PERMISSIONS, can, type Permission, type Role } from "../src/lib/permissions";

const ROLES: Role[] = ["SUPER_ADMIN", "OWNER", "ADMIN", "VIEWER"];
const ALL: Role[] = ["SUPER_ADMIN", "OWNER", "ADMIN", "VIEWER"];
const STAFF: Role[] = ["SUPER_ADMIN", "OWNER", "ADMIN"];
const OWNER: Role[] = ["SUPER_ADMIN", "OWNER"];

const EXPECTED: Record<Permission, Role[]> = {
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

  it("Viewer hanya bisa membaca rekap dan jurnal", () => {
    for (const p of Object.keys(PERMISSIONS) as Permission[]) {
      expect(can("VIEWER", p)).toBe(p === "recap:read" || p === "journal:read");
    }
  });

  it("Super admin punya hak yang sama persis dengan owner", () => {
    for (const p of Object.keys(PERMISSIONS) as Permission[]) {
      expect(can("SUPER_ADMIN", p)).toBe(can("OWNER", p));
    }
  });

  it("Super admin disembunyikan dari daftar akun, role lain tidak", () => {
    expect(HIDDEN_ROLES).toEqual(["SUPER_ADMIN"]);
  });

  it("Admin tidak bisa mengelola tarif atau melihat audit log", () => {
    expect(can("ADMIN", "price-rate:write")).toBe(false);
    expect(can("ADMIN", "audit-log:read")).toBe(false);
  });
});
