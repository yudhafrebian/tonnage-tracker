-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'VIEWER');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyRecap" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "processTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "processExport" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "processLocal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "packingTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "packingExport" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "packingLocal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stockTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stockExport" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stockLocal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRecap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRate" (
    "id" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "pricePerKg" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecap_date_key" ON "DailyRecap"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PriceRate_effectiveFrom_key" ON "PriceRate"("effectiveFrom");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
