-- CreateEnum
CREATE TYPE "PermissionModule" AS ENUM ('STUDENTS', 'CLASSES', 'ATTENDANCE', 'CLASS_LOGS', 'TUITION', 'CALENDAR', 'NOTIFICATIONS', 'REPORTS');

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "academyId" INTEGER NOT NULL,
    "role" "UserRole" NOT NULL,
    "module" "PermissionModule" NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_academyId_role_module_key" ON "role_permissions"("academyId", "role", "module");

-- CreateIndex
CREATE INDEX "role_permissions_academyId_idx" ON "role_permissions"("academyId");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
