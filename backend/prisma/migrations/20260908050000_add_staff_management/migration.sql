-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "academies" ADD COLUMN "staffJoinCode" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "academies_staffJoinCode_key" ON "academies"("staffJoinCode");
