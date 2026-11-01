import path from "path";
import ExcelJS from "exceljs";
import request from "supertest";
import { Prisma } from "../src/generated/prisma/client";
import { dateOfSheetName, parseJournalWorkbook } from "../src/modules/journal/journal.excel";

const db = {
  user: { findUnique: jest.fn() },
  journalEntry: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    groupBy: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  supplierMarket: { findMany: jest.fn(), upsert: jest.fn() },
  auditLog: { create: jest.fn() },
};

jest.mock("../src/config/prisma", () => ({
  prisma: {
    ...db,
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: (fn: (tx: unknown) => unknown) => fn(db),
  },
}));

import { app } from "../src/app";
import { signToken } from "../src/lib/token";

type Role = "OWNER" | "ADMIN" | "VIEWER";
const CSRF = { "X-Requested-With": "test" };
const USER_ID = "11111111-1111-4111-8111-111111111111";
const ASSET = path.join(__dirname, "..", "assets", "Data Global Oktober 2026.xlsx");

const as = (role: Role) => {
  db.user.findUnique.mockResolvedValue({ id: USER_ID, username: "u", name: "U", role, active: true });
  return { Cookie: `tonnage_token=${signToken(USER_ID)}` };
};

const day = (s: string) => new Date(`${s}T00:00:00Z`);

beforeEach(() => {
  jest.clearAllMocks();
  db.supplierMarket.findMany.mockResolvedValue([]);
  db.journalEntry.groupBy.mockResolvedValue([]);
  db.journalEntry.deleteMany.mockResolvedValue({ count: 0 });
  db.journalEntry.createMany.mockImplementation(({ data }: { data: unknown[] }) => ({ count: data.length }));
});

describe("dateOfSheetName", () => {
  it.each([
    ["6 OKT 26", "2026-10-06"],
    ["16 OKT 2026", "2026-10-16"],
    [" 1 okt 26 ", "2026-10-01"],
    ["3 AGS 26", "2026-08-03"],
  ])("%s -> %s", (name, date) => expect(dateOfSheetName(name)).toBe(date));

  it.each(["REKAP OKT", "31 FEB 26", "Sheet1", "6 XYZ 26"])("%s -> null", (name) =>
    expect(dateOfSheetName(name)).toBeNull(),
  );
});

describe("parseJournalWorkbook: file Oktober asli", () => {
  let result: ReturnType<typeof parseJournalWorkbook>;
  beforeAll(async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(ASSET);
    result = parseJournalWorkbook(wb);
  });

  const rowsOf = (date: string, section: string) =>
    result.ok ? result.entries.filter((e) => e.date === date && e.section === section) : [];
  const kgOf = (rows: { kg: number }[]) => Math.round(rows.reduce((a, e) => a + e.kg, 0) * 10) / 10;

  it("16 sheet harian terbaca tanpa error, sheet REKAP diabaikan", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.dates).toHaveLength(16);
    expect(result.dates[0]).toEqual({ date: "2026-10-01", sheet: "1 OKT 26" });
  });

  it("total per bagian sama dengan baris TOTAL di sheet harian", () => {
    expect(kgOf(rowsOf("2026-10-06", "PROCESS"))).toBe(2526.2);
    expect(rowsOf("2026-10-06", "PROCESS")).toHaveLength(15);
    expect(kgOf(rowsOf("2026-10-01", "PACKING"))).toBe(608);
    expect(kgOf(rowsOf("2026-10-01", "STOCK"))).toBe(84332.5);
  });

  it("baris disalin apa adanya, termasuk MC untuk packing & sisa (proses tanpa MC)", () => {
    expect(rowsOf("2026-10-06", "PROCESS")[0]).toMatchObject({
      party: "H. TINING", item: "BELO", size: "0", mc: null, kg: 575, position: 0,
    });
    expect(rowsOf("2026-10-01", "PACKING")[0]).toMatchObject({
      party: "TEK TONI", item: "BEKUTAK @9,5KG", size: "30-50", mc: 12, kg: 114,
    });
    expect(rowsOf("2026-10-01", "STOCK")[0]).toMatchObject({ party: "ASMUJI 2", item: "KEONG", size: "-", mc: 594 });
  });

  it("sheet tanpa blok wajib ditolak dengan pesan per blok", () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("2 OKT 26").getRow(2).getCell(1).value = "PROSES TGL 2";
    const r = parseJournalWorkbook(wb);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.map((e) => e.code)).toEqual(["block_missing", "block_missing", "block_missing"]);
  });
});

describe("routes /journals", () => {
  it("tanpa login: 401", async () => {
    await request(app).get("/api/v1/journals?date=2026-10-06").set(CSRF).expect(401);
  });

  it("VIEWER boleh melihat jurnal satu tanggal", async () => {
    db.journalEntry.findMany.mockResolvedValue([
      {
        id: "j1", date: day("2026-10-06"), section: "PROCESS", party: "H. TINING", item: "BELO", size: "0",
        mc: null, kg: new Prisma.Decimal(575), market: "LOCAL", position: 0, createdAt: day("2026-10-06"), updatedAt: day("2026-10-06"),
      },
    ]);
    const res = await request(app).get("/api/v1/journals?date=2026-10-06").set(CSRF).set(as("VIEWER")).expect(200);
    expect(res.body.data).toEqual({
      date: "2026-10-06",
      entries: [{ id: "j1", section: "PROCESS", party: "H. TINING", item: "BELO", size: "0", mc: null, kg: 575, market: "LOCAL" }],
    });
  });

  it("VIEWER tidak boleh import", async () => {
    // File kecil: server menolak sebelum membaca body, file besar membuat koneksi direset di tengah upload.
    await request(app)
      .post("/api/v1/journals/import?dryRun=true")
      .set(CSRF)
      .set(as("VIEWER"))
      .attach("file", Buffer.from("x"), "jurnal.xlsx")
      .expect(403);
  });

  it("pratinjau: label pasar yang dikenal terisi, tanggal yang sudah ada ditandai, tidak ada yang disimpan", async () => {
    db.supplierMarket.findMany.mockResolvedValue([{ name: "TEK", market: "EXPORT" }]);
    db.journalEntry.groupBy.mockResolvedValue([{ date: day("2026-10-06"), _count: { _all: 40 } }]);
    const res = await request(app).post("/api/v1/journals/import?dryRun=true").set(CSRF).set(as("ADMIN")).attach("file", ASSET).expect(200);

    const data = res.body.data;
    expect(data.dates).toHaveLength(16);
    expect(data.dates.find((d: { date: string }) => d.date === "2026-10-06")).toMatchObject({ replaces: true });
    expect(data.dates.find((d: { date: string }) => d.date === "2026-10-01")).toMatchObject({
      replaces: false,
      sections: { PACKING: { rows: 2, kg: 608 } },
    });
    expect(data.suppliers.find((s: { name: string }) => s.name === "TEK").market).toBe("EXPORT");
    expect(data.suppliers.find((s: { name: string }) => s.name === "H. TINING").market).toBeNull();
    expect(data.entries.length).toBeGreaterThan(1000);
    expect(db.journalEntry.createMany).not.toHaveBeenCalled();
  });

  it("simpan tanpa label untuk semua supplier: 400 dengan daftar supplier", async () => {
    const res = await request(app)
      .post("/api/v1/journals/import")
      .set(CSRF)
      .set(as("ADMIN"))
      .attach("file", ASSET)
      .field("markets", JSON.stringify({ suppliers: { TEK: "EXPORT" } }))
      .expect(400);
    expect(res.body.error.fields.suppliers).toContain("H. TINING");
    expect(db.journalEntry.createMany).not.toHaveBeenCalled();
  });

  it("simpan: data tanggal di file diganti, label per baris menimpa label supplier, satu catatan audit", async () => {
    const preview = await request(app).post("/api/v1/journals/import?dryRun=true").set(CSRF).set(as("OWNER")).attach("file", ASSET);
    const suppliers = Object.fromEntries(
      preview.body.data.suppliers.map((s: { name: string }) => [s.name, s.name.startsWith("TEK") ? "EXPORT" : "LOCAL"]),
    );
    const firstTek = preview.body.data.entries.find((e: { party: string }) => e.party === "TEK");

    db.journalEntry.deleteMany.mockResolvedValue({ count: 12 });
    const res = await request(app)
      .post("/api/v1/journals/import")
      .set(CSRF)
      .set(as("OWNER"))
      .attach("file", ASSET)
      .field("markets", JSON.stringify({ suppliers, rows: { [firstTek.key]: "LOCAL" } }))
      .expect(201);

    const where = db.journalEntry.deleteMany.mock.calls[0][0].where;
    expect(where.date.in).toHaveLength(16);
    expect(where.section.in).toEqual(["PROCESS", "PACKING", "STOCK"]);

    const data = db.journalEntry.createMany.mock.calls[0][0].data as { party: string; market: string; kg: number }[];
    expect(data.filter((r) => r.party === "H. TINING").every((r) => r.market === "LOCAL")).toBe(true);
    const tek = data.filter((r) => r.party === "TEK");
    expect(tek[0]!.market).toBe("LOCAL"); // ditimpa per baris
    expect(tek.slice(1).every((r) => r.market === "EXPORT")).toBe(true);

    expect(db.supplierMarket.upsert).toHaveBeenCalledTimes(Object.keys(suppliers).length);
    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    expect(db.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "import", entity: "Journal" });
    expect(res.body.data.saved).toEqual({ removed: 12, created: data.length });
  });
});
