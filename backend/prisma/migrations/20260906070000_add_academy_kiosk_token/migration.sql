-- AlterTable
ALTER TABLE "academies" ADD COLUMN "kioskToken" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "academies_kioskToken_key" ON "academies"("kioskToken");
