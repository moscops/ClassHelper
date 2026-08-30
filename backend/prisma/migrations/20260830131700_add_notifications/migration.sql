-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('UNATTENDED_ALERT', 'ATTENDANCE_CHECKIN', 'ATTENDANCE_CHECKOUT', 'TUITION_DUE', 'SYSTEM_NOTICE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'KAKAO', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "academyId" INTEGER NOT NULL,
    "userId" INTEGER,
    "studentId" INTEGER,
    "classId" INTEGER,
    "type" "NotificationType" NOT NULL DEFAULT 'UNATTENDED_ALERT',
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'SENT',
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "targetPhone" VARCHAR(20),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_academyId_isRead_idx" ON "notifications"("academyId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_academyId_type_idx" ON "notifications"("academyId", "type");

-- CreateIndex
CREATE INDEX "notifications_academyId_createdAt_idx" ON "notifications"("academyId", "createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
