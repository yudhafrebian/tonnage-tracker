-- CreateEnum
CREATE TYPE "JournalSection" AS ENUM ('PROCESS', 'PACKING', 'STOCK', 'OUT');

-- CreateEnum
CREATE TYPE "Market" AS ENUM ('EXPORT', 'LOCAL');

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "section" "JournalSection" NOT NULL,
    "party" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "size" TEXT,
    "mc" DECIMAL(12,2),
    "kg" DECIMAL(12,2) NOT NULL,
    "market" "Market" NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierMarket" (
    "name" TEXT NOT NULL,
    "market" "Market" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierMarket_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "JournalEntry_date_section_idx" ON "JournalEntry"("date", "section");
