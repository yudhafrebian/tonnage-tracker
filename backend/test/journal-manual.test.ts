import request from "supertest";
import { Prisma } from "../src/generated/prisma/client";

const db = {
  user: { findUnique: jest.fn() },
  journalEntry: {
    aggregate: jest.fn(),
    createManyAndReturn: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  stockDiscrepancy: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
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
const D = (v: number) => new Prisma.Decimal(v);
const day = (s: string) => new Date(`${s}T00:00:00Z`);

const as = (role: Role) => {
  db.user.findUnique.mockResolvedValue({ id: USER_ID, username: "u", name: "U", role, active: true });
  return { Cookie: `tonnage_token=${signToken(USER_ID)}` };
};

const row = (over: Record<string, unknown> = {}) => ({
  id: "e1",
  date: day("2026-10-30"),
  section: "OUT",
  party: "P. Dendi",
  item: "Daging",
  size: "KCL",
  mc: D(72),
  kg: D(736),
  market: "LOCAL",
  position: 0,
  createdAt: day("2026-10-30"),
  updatedAt: day("2026-10-30"),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.journalEntry.aggregate.mockResolvedValue({ _max: { position: null } });
  db.journalEntry.createManyAndReturn.mockImplementation(({ data }: { data: Record<string, unknown>[] }) =>
    data.map((d, i) => ({
      ...row(),
      ...d,
      id: `n${i}`,
      mc: d.mc == null ? null : D(d.mc as number),
      kg: D(d.kg as number),
    })),
  );
});

describe("input manual jurnal", () => {
  it("barang keluar: beberapa baris untuk satu pelanggan, disalin apa adanya, satu catatan audit", async () => {
    db.journalEntry.aggregate.mockResolvedValue({ _max: { position: 4 } });
    const res = await request(app)
      .post("/api/v1/journals/entries")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({
        date: "2026-10-30",
        section: "OUT",
        party: "  P. Dendi ",
        market: "LOCAL",
        rows: [
          { item: "Daging", size: "KCL", mc: 72, kg: 736 },
          { item: "Cumi", size: "", kg: 73.9 },
        ],
      })
      .expect(201);

    const data = db.journalEntry.createManyAndReturn.mock.calls[0][0].data;
    expect(data).toEqual([
      expect.objectContaining({ party: "P. Dendi", item: "Daging", size: "KCL", mc: 72, kg: 736, position: 5, section: "OUT" }),
      expect.objectContaining({ item: "Cumi", size: null, mc: null, kg: 73.9, position: 6 }),
    ]);
    expect(res.body.data).toHaveLength(2);
    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    expect(db.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "create", entity: "JournalEntry" });
  });

  it("proses tidak punya MC: MC yang dikirim diabaikan", async () => {
    await request(app)
      .post("/api/v1/journals/entries")
      .set(CSRF)
      .set(as("OWNER"))
      .send({ date: "2026-10-30", section: "PROCESS", party: "TEK", market: "EXPORT", rows: [{ item: "BEKUTAK", mc: 5, kg: 50 }] })
      .expect(201);
    expect(db.journalEntry.createManyAndReturn.mock.calls[0][0].data[0].mc).toBeNull();
  });

  it("VIEWER tidak boleh menambah; tanpa baris: 400", async () => {
    const body = { date: "2026-10-30", section: "OUT", party: "X", market: "LOCAL", rows: [] };
    await request(app).post("/api/v1/journals/entries").set(CSRF).set(as("VIEWER")).send(body).expect(403);
    await request(app).post("/api/v1/journals/entries").set(CSRF).set(as("ADMIN")).send(body).expect(400);
  });

  it("edit hanya mengubah field yang dikirim (size tetap), audit sebelum/sesudah", async () => {
    db.journalEntry.findUnique.mockResolvedValue(row());
    db.journalEntry.update.mockResolvedValue(row({ kg: D(740) }));
    await request(app).patch("/api/v1/journals/entries/e1").set(CSRF).set(as("ADMIN")).send({ kg: 740 }).expect(200);
    const data = db.journalEntry.update.mock.calls[0][0].data;
    expect(data.kg).toBe(740);
    expect(data.size).toBeUndefined();
    expect(db.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "update", before: { kg: 736 }, after: { kg: 740 } });
  });

  it("hapus baris yang tidak ada: 404", async () => {
    db.journalEntry.findUnique.mockResolvedValue(null);
    await request(app).delete("/api/v1/journals/entries/x").set(CSRF).set(as("ADMIN")).expect(404);
  });
});

describe("salin sisa stok dari tanggal sebelumnya", () => {
  it("menyalin semua baris sisa stok tanggal terakhir sebelumnya", async () => {
    db.journalEntry.count.mockResolvedValue(0);
    db.journalEntry.findFirst.mockResolvedValue({ date: day("2026-10-16") });
    db.journalEntry.findMany.mockResolvedValue([
      row({ section: "STOCK", party: "AGUNG", item: "BELO", mc: D(283), kg: D(2830), position: 0 }),
      row({ section: "STOCK", party: "TEK", item: "JAKET HL", mc: D(4), kg: D(40), market: "EXPORT", position: 1 }),
    ]);
    const res = await request(app).post("/api/v1/journals/copy-stock").set(CSRF).set(as("ADMIN")).send({ date: "2026-10-17" }).expect(201);
    expect(res.body.data).toEqual({ from: "2026-10-16", rows: 2 });
    const data = db.journalEntry.createManyAndReturn.mock.calls[0][0].data;
    expect(data[1]).toMatchObject({ section: "STOCK", party: "TEK", market: "EXPORT", date: day("2026-10-17") });
  });

  it("tanggal yang sudah punya sisa stok: 409, tidak ada yang disalin", async () => {
    db.journalEntry.count.mockResolvedValue(3);
    const res = await request(app).post("/api/v1/journals/copy-stock").set(CSRF).set(as("ADMIN")).send({ date: "2026-10-17" }).expect(409);
    expect(res.body.error.code).toBe("stock_exists");
    expect(db.journalEntry.createManyAndReturn).not.toHaveBeenCalled();
  });

  it("belum ada sisa stok sebelumnya: 404 no_previous_stock", async () => {
    db.journalEntry.count.mockResolvedValue(0);
    db.journalEntry.findFirst.mockResolvedValue(null);
    const res = await request(app).post("/api/v1/journals/copy-stock").set(CSRF).set(as("ADMIN")).send({ date: "2026-10-01" }).expect(404);
    expect(res.body.error.code).toBe("no_previous_stock");
  });
});

describe("catatan selisih stok", () => {
  const stored = (over: Record<string, unknown> = {}) => ({
    id: "s1",
    date: day("2026-10-24"),
    party: "DENDI",
    item: "DAGING KCL",
    size: null,
    mcDiff: D(4),
    kgDiff: D(40),
    cause: "OUT_UNRECORDED",
    note: "Keluar 22 Okt belum masuk laporan",
    status: "OPEN",
    resolution: null,
    resolvedAt: null,
    createdById: USER_ID,
    createdBy: { id: USER_ID, username: "u", name: "U" },
    createdAt: day("2026-10-24"),
    updatedAt: day("2026-10-24"),
    ...over,
  });

  it("VIEWER boleh melihat daftar beserta jumlah yang belum selesai", async () => {
    db.stockDiscrepancy.findMany.mockResolvedValue([stored()]);
    db.stockDiscrepancy.count.mockResolvedValue(1);
    const res = await request(app).get("/api/v1/discrepancies?status=OPEN").set(CSRF).set(as("VIEWER")).expect(200);
    expect(res.body.data.openCount).toBe(1);
    expect(res.body.data.items[0]).toMatchObject({ party: "DENDI", mcDiff: 4, kgDiff: 40, status: "OPEN" });
  });

  it("mencatat selisih negatif; MC dan Kg tidak boleh kosong dua-duanya", async () => {
    db.stockDiscrepancy.create.mockResolvedValue(stored({ mcDiff: D(-2), kgDiff: D(-20) }));
    await request(app)
      .post("/api/v1/discrepancies")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ date: "2026-10-24", party: "DENDI", item: "DAGING KCL", mcDiff: -2, kgDiff: -20, cause: "DAMAGE" })
      .expect(201);
    expect(db.stockDiscrepancy.create.mock.calls[0][0].data).toMatchObject({ mcDiff: -2, kgDiff: -20, createdById: USER_ID });

    await request(app)
      .post("/api/v1/discrepancies")
      .set(CSRF)
      .set(as("ADMIN"))
      .send({ date: "2026-10-24", party: "DENDI", item: "DAGING KCL", cause: "DAMAGE" })
      .expect(400);
  });

  it("ditandai selesai: waktu selesai dicatat, audit sebelum/sesudah", async () => {
    db.stockDiscrepancy.findUnique.mockResolvedValue(stored());
    db.stockDiscrepancy.update.mockResolvedValue(stored({ status: "RESOLVED", resolution: "Sudah dicek" }));
    await request(app)
      .patch("/api/v1/discrepancies/s1")
      .set(CSRF)
      .set(as("OWNER"))
      .send({ status: "RESOLVED", resolution: "Sudah dicek" })
      .expect(200);
    expect(db.stockDiscrepancy.update.mock.calls[0][0].data.resolvedAt).toBeInstanceOf(Date);
    expect(db.auditLog.create.mock.calls[0][0].data).toMatchObject({
      entity: "StockDiscrepancy",
      before: { status: "OPEN" },
      after: { status: "RESOLVED", resolution: "Sudah dicek" },
    });
  });
});
