-- CreateEnum
CREATE TYPE "DiscrepancyCause" AS ENUM ('MISCOUNT', 'DAMAGE', 'OUT_UNRECORDED', 'OTHER');

-- CreateEnum
CREATE TYPE "DiscrepancyStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "StockDiscrepancy" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "party" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "size" TEXT,
    "mcDiff" DECIMAL(12,2),
    "kgDiff" DECIMAL(12,2),
    "cause" "DiscrepancyCause" NOT NULL,
    "note" TEXT,
    "status" "DiscrepancyStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockDiscrepancy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockDiscrepancy_date_idx" ON "StockDiscrepancy"("date");

-- CreateIndex
CREATE INDEX "StockDiscrepancy_status_idx" ON "StockDiscrepancy"("status");

-- AddForeignKey
ALTER TABLE "StockDiscrepancy" ADD CONSTRAINT "StockDiscrepancy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
