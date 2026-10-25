import { hashPassword } from "../src/lib/hash-password";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { prisma } from "../src/config/prisma";
import { importMonth } from "../src/modules/recap/recap.service";

type SeedUser = { username: string; name: string; role: "OWNER" | "ADMIN" | "VIEWER"; password?: string };

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD wajib diisi di .env (minimal 12 karakter)");
  }

  const users: SeedUser[] = [
    { username: "admin", name: "Admin", role: "ADMIN", password: adminPassword },
    // Opsional: hanya dibuat kalau passwordnya diisi di .env
    { username: "viewer", name: "Viewer", role: "VIEWER", password: process.env.SEED_VIEWER_PASSWORD },
    { username: "owner", name: "Owner", role: "OWNER", password: process.env.SEED_OWNER_PASSWORD },
  ];

  for (const u of users) {
    if (!u.password) continue;
    if (u.password.length < 12) throw new Error(`Password ${u.username} minimal 12 karakter`);
    await prisma.user.upsert({
      where: { username: u.username },
      // Kalau seed diulang, password yang sudah diganti user tidak ditimpa.
      update: { name: u.name, role: u.role, active: true },
      create: {
        username: u.username,
        name: u.name,
        role: u.role,
        active: true,
        passwordHash: await hashPassword(u.password),
      },
    });
    console.log(`OK: ${u.role} ${u.username}`);
  }

  // Tarif awal: Rp 2.500 per kg proses, berlaku mulai 1 Okt 2026.
  // Kalau seed diulang, tarif yang sudah diubah owner tidak ditimpa.
  await prisma.priceRate.upsert({
    where: { effectiveFrom: new Date("2026-10-01T00:00:00Z") },
    update: {},
    create: { effectiveFrom: new Date("2026-10-01T00:00:00Z"), pricePerKg: 2500 },
  });
  console.log("OK: tarif 2500/kg mulai 2026-10-01");

  // Rekap Oktober 2026 dari Excel admin, lewat jalur import yang sama dengan API.
  // onConflict "skip": tanggal yang sudah diubah lewat aplikasi tidak ditimpa saat seed diulang.
  const file = path.join(__dirname, "..", "assets", "Data Global Oktober 2026.xlsx");
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!existsSync(file) || !admin) {
    console.log("SKIP: rekap Oktober (file assets atau user admin tidak ada)");
    return;
  }
  const result = await importMonth(admin.id, "2026-10", readFileSync(file), {
    dryRun: false,
    onConflict: "skip",
  });
  console.log(`OK: rekap ${result.month} dari sheet "${result.sheet}"`, result.summary);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());