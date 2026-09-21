-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('ACADEMY', 'EXAM', 'SPECIAL', 'HOLIDAY', 'CONSULTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "EventColor" AS ENUM ('INDIGO', 'PURPLE', 'ROSE', 'AMBER', 'EMERALD', 'BLUE', 'SLATE');

-- CreateTable
CREATE TABLE "academy_events" (
    "id" SERIAL NOT NULL,
    "academyId" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "category" "EventCategory" NOT NULL DEFAULT 'OTHER',
    "color" "EventColor" NOT NULL DEFAULT 'INDIGO',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "startTime" VARCHAR(5),
    "endTime" VARCHAR(5),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academy_events_academyId_startDate_idx" ON "academy_events"("academyId", "startDate");

-- CreateIndex
CREATE INDEX "academy_events_academyId_category_idx" ON "academy_events"("academyId", "category");

-- AddForeignKey
ALTER TABLE "academy_events" ADD CONSTRAINT "academy_events_academyId_fkey" FOREIGN KEY ("academyId") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
