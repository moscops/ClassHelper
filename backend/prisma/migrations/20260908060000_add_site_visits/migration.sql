-- CreateEnum
CREATE TYPE "VisitorType" AS ENUM ('ANONYMOUS', 'STAFF');

-- CreateTable
CREATE TABLE "site_visits" (
    "id" BIGSERIAL NOT NULL,
    "visitDate" DATE NOT NULL,
    "type" "VisitorType" NOT NULL,
    "dedupKey" VARCHAR(120) NOT NULL,
    "userId" INTEGER,
    "academyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_visits_visitDate_dedupKey_key" ON "site_visits"("visitDate", "dedupKey");

-- CreateIndex
CREATE INDEX "site_visits_visitDate_idx" ON "site_visits"("visitDate");

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_visits" ADD CONSTRAINT "site_visits_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
