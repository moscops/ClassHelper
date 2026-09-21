# Site Visit Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let SUPER_ADMIN see, per day, how many anonymous visitors, staff logins, new signups, and new academies the platform had — backend only (frontend beacon call + chart are handed off separately).

**Architecture:** One new Prisma model (`SiteVisit`) records deduplicated daily visits (anonymous via a public beacon endpoint, staff via a hook in the existing login flow). A new `analytics` module exposes `POST /analytics/track` (public) and `GET /analytics/stats` (SUPER_ADMIN), the latter merging `SiteVisit` counts with existing `User.createdAt`/`Academy.createdAt` data — no new tracking needed for signups/academies.

**Tech Stack:** NestJS 11, Prisma 7 (PostgreSQL), class-validator, `@nestjs/throttler`, Jest.

**Spec:** `backend/docs/superpowers/specs/2026-09-08-site-visit-analytics-design.md`

## Global Constraints

- Every Prisma query must scope tenant data by `academyId` where applicable — N/A here except that `SiteVisit.academyId` is stored (not filtered) since this feature is platform-wide (SUPER_ADMIN only), per spec §2/§5.2.
- Visit-recording must never throw into a caller's request that isn't about visit-tracking — the login hook wraps the call in try/catch (spec §6).
- `POST /analytics/track` stores no PII — only a client-generated random UUID, no IP/User-Agent (spec §5.1).
- `GET /analytics/stats` response must have zero gaps across the requested date range (spec §5.2).
- Follow existing repo conventions exactly: Prisma upsert-with-compound-key style (`src/attendance/attendance.service.ts`), `@Throttle({ default: { limit: 5, ttl: 60000 } })` for public endpoints (matches `/auth/login`), `@Roles(...)` + `JwtAuthGuard`/`RolesGuard` for protected ones, DTO validation style from `src/class-logs/dto/query-class-logs.dto.ts`.
- Working directory for all commands below: `/home/joshywoshy/ClassHelper/backend`.

---

### Task 1: Prisma schema + migration for `SiteVisit`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260908060000_add_site_visits/migration.sql`

**Interfaces:**
- Produces: Prisma model `SiteVisit { id: BigInt, visitDate: Date, type: VisitorType, dedupKey: String, userId?: Int, academyId?: Int, createdAt: DateTime }`, enum `VisitorType { ANONYMOUS, STAFF }`. Compound unique `visitDate_dedupKey` (Prisma's auto-generated name for `@@unique([visitDate, dedupKey])` — confirmed by existing usage of the same pattern in `src/attendance/attendance.service.ts`'s `studentId_classId_date`).

- [ ] **Step 1: Add `VisitorType` enum and `SiteVisit` model to `prisma/schema.prisma`**

Add this enum near the other small enums (e.g. right after `enum UserStatus`):

```prisma
enum VisitorType {
  ANONYMOUS // 비로그인 방문자 (공개 랜딩/로그인 페이지)
  STAFF     // 로그인한 교직원
}
```

Add this model after the `User` model:

```prisma
model SiteVisit {
  id        BigInt      @id @default(autoincrement())
  visitDate DateTime    @db.Date // 하루 단위로 truncate된 날짜
  type      VisitorType
  // 로그인: "user:{userId}", 비로그인: "anon:{visitorId}". 같은 날 같은 dedupKey는 1건만 남는다.
  dedupKey  String      @db.VarChar(120)
  userId    Int?
  academyId Int?

  createdAt DateTime @default(now())

  user    User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  academy Academy? @relation(fields: [academyId], references: [id], onDelete: SetNull)

  @@unique([visitDate, dedupKey])
  @@index([visitDate])
  @@map("site_visits")
}
```

In the `User` model, add the back-relation field (alongside the other `X[]` relation fields, e.g. right after `auditLogs AuditLog[] @relation("AdminAuditLogs")`):

```prisma
  siteVisits SiteVisit[]
```

In the `Academy` model, add the back-relation field (alongside the other relation array fields, e.g. right after `subscription Subscription?`):

```prisma
  siteVisits SiteVisit[]
```

- [ ] **Step 2: Write the migration SQL**

Create `prisma/migrations/20260908060000_add_site_visits/migration.sql`:

```sql
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
```

- [ ] **Step 3: Regenerate the Prisma client**

Run: `yarn prisma:generate`
Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Apply the migration to the local dev DB and verify**

Run: `yarn prisma:migrate:deploy`
Expected: `Applying migration \`20260908060000_add_site_visits\`` then `All migrations have been successfully applied.`

Run: `yarn prisma migrate status`
Expected: `Database schema is up to date!`

(If the local DB is unreachable in this environment, note that clearly instead of claiming success — do not skip this step silently. The previous session's local-login-500 incident was caused by exactly this migration step being skipped.)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260908060000_add_site_visits/
git commit -m "feat(analytics): add SiteVisit model and migration"
```

---

### Task 2: `AnalyticsService` (TDD)

**Files:**
- Create: `src/analytics/dto/daily-analytics-stats.dto.ts`
- Create: `src/analytics/analytics.service.ts`
- Test: `src/analytics/analytics.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (from `../prisma/prisma.service`), Prisma `VisitorType`/`UserRole` enums (from `@prisma/client`).
- Produces:
  - `AnalyticsService.trackAnonymousVisit(visitorId: string): Promise<void>`
  - `AnalyticsService.recordStaffVisit(userId: number, academyId: number | null): Promise<void>`
  - `AnalyticsService.getStats(startDate?: string, endDate?: string): Promise<DailyAnalyticsStatsDto[]>`
  - `DailyAnalyticsStatsDto { date: string; anonymousVisitors: number; loginCount: number; newSignups: number; newAcademies: number; }`

- [ ] **Step 1: Create the response DTO**

`src/analytics/dto/daily-analytics-stats.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class DailyAnalyticsStatsDto {
  @ApiProperty({ example: '2026-09-08', description: '날짜 (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: 42, description: '비로그인 고유 방문자 수' })
  anonymousVisitors: number;

  @ApiProperty({ example: 15, description: '그날 로그인한 고유 사용자 수' })
  loginCount: number;

  @ApiProperty({
    example: 3,
    description: '신규 가입자 수 (원장/실장/강사/조교 통합, SUPER_ADMIN 제외)',
  })
  newSignups: number;

  @ApiProperty({ example: 1, description: '신규 개설 학원 수' })
  newAcademies: number;
}
```

- [ ] **Step 2: Write the failing tests**

`src/analytics/analytics.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, VisitorType } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      siteVisit: {
        upsert: jest.fn(),
        groupBy: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      academy: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackAnonymousVisit', () => {
    it('dedupKey를 anon: 접두사로 만들어 upsert한다', async () => {
      prisma.siteVisit.upsert.mockResolvedValue({});

      await service.trackAnonymousVisit('a1b2c3d4-e5f6-4789-a012-3456789abcde');

      expect(prisma.siteVisit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            visitDate_dedupKey: expect.objectContaining({
              dedupKey: 'anon:a1b2c3d4-e5f6-4789-a012-3456789abcde',
            }),
          },
          create: expect.objectContaining({
            type: VisitorType.ANONYMOUS,
            dedupKey: 'anon:a1b2c3d4-e5f6-4789-a012-3456789abcde',
          }),
          update: {},
        }),
      );
    });
  });

  describe('recordStaffVisit', () => {
    it('dedupKey를 user: 접두사로 만들어 userId/academyId와 함께 upsert한다', async () => {
      prisma.siteVisit.upsert.mockResolvedValue({});

      await service.recordStaffVisit(7, 10);

      expect(prisma.siteVisit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            visitDate_dedupKey: expect.objectContaining({ dedupKey: 'user:7' }),
          },
          create: expect.objectContaining({
            type: VisitorType.STAFF,
            dedupKey: 'user:7',
            userId: 7,
            academyId: 10,
          }),
          update: {},
        }),
      );
    });

    it('academyId가 null이면 academyId 없이 기록한다', async () => {
      prisma.siteVisit.upsert.mockResolvedValue({});

      await service.recordStaffVisit(7, null);

      expect(prisma.siteVisit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ userId: 7, academyId: undefined }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('날짜 범위 내 방문/로그인/가입/학원개설을 날짜별로 병합하고 빈 날짜는 0으로 채운다', async () => {
      prisma.siteVisit.groupBy.mockResolvedValue([
        { visitDate: new Date('2026-09-07T00:00:00.000Z'), type: VisitorType.ANONYMOUS, _count: { _all: 5 } },
        { visitDate: new Date('2026-09-08T00:00:00.000Z'), type: VisitorType.STAFF, _count: { _all: 2 } },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { createdAt: new Date('2026-09-08T03:00:00.000Z') },
      ]);
      prisma.academy.findMany.mockResolvedValue([
        { createdAt: new Date('2026-09-07T10:00:00.000Z') },
      ]);

      const result = await service.getStats('2026-09-06', '2026-09-08');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: '2026-09-06',
        anonymousVisitors: 0,
        loginCount: 0,
        newSignups: 0,
        newAcademies: 0,
      });
      expect(result[1]).toEqual({
        date: '2026-09-07',
        anonymousVisitors: 5,
        loginCount: 0,
        newSignups: 0,
        newAcademies: 1,
      });
      expect(result[2]).toEqual({
        date: '2026-09-08',
        anonymousVisitors: 0,
        loginCount: 2,
        newSignups: 1,
        newAcademies: 0,
      });
    });

    it('startDate/endDate 생략 시 오늘 기준 최근 30일을 조회한다', async () => {
      prisma.siteVisit.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.academy.findMany.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result).toHaveLength(30);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { not: UserRole.SUPER_ADMIN },
          }),
        }),
      );
    });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `yarn jest src/analytics/analytics.service.spec.ts`
Expected: FAIL — `Cannot find module './analytics.service'` (file doesn't exist yet).

- [ ] **Step 4: Implement `AnalyticsService`**

`src/analytics/analytics.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { UserRole, VisitorType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DailyAnalyticsStatsDto } from './dto/daily-analytics-stats.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 비로그인 방문자 기록 (공개 beacon 엔드포인트에서 호출).
   */
  async trackAnonymousVisit(visitorId: string): Promise<void> {
    await this.recordVisit({
      type: VisitorType.ANONYMOUS,
      dedupKey: `anon:${visitorId}`,
    });
  }

  /**
   * 로그인 사용자 방문 기록 (AuthService.login()에서 호출).
   */
  async recordStaffVisit(
    userId: number,
    academyId: number | null,
  ): Promise<void> {
    await this.recordVisit({
      type: VisitorType.STAFF,
      dedupKey: `user:${userId}`,
      userId,
      academyId: academyId ?? undefined,
    });
  }

  /**
   * 방문 1건을 오늘 날짜로 기록한다. 같은 날 같은 dedupKey는 upsert의 update:{}로
   * no-op 처리되어 중복 집계되지 않는다.
   */
  private async recordVisit(input: {
    type: VisitorType;
    dedupKey: string;
    userId?: number;
    academyId?: number;
  }): Promise<void> {
    const visitDate = truncateToDate(new Date());
    await this.prisma.siteVisit.upsert({
      where: { visitDate_dedupKey: { visitDate, dedupKey: input.dedupKey } },
      create: {
        visitDate,
        type: input.type,
        dedupKey: input.dedupKey,
        userId: input.userId,
        academyId: input.academyId,
      },
      update: {},
    });
  }

  /**
   * 날짜 범위별 방문/로그인/가입/학원개설 통계. 범위 내 모든 날짜를 빠짐없이
   * 0으로 채워 반환한다(프론트 차트가 연속된 날짜 축을 그릴 수 있도록).
   */
  async getStats(
    startDate?: string,
    endDate?: string,
  ): Promise<DailyAnalyticsStatsDto[]> {
    const end = endDate
      ? truncateToDate(new Date(endDate))
      : truncateToDate(new Date());
    const start = startDate ? truncateToDate(new Date(startDate)) : addDays(end, -29);

    const [visits, users, academies] = await Promise.all([
      this.prisma.siteVisit.groupBy({
        by: ['visitDate', 'type'],
        where: { visitDate: { gte: start, lte: end } },
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: {
          createdAt: { gte: start, lte: endOfDay(end) },
          role: { not: UserRole.SUPER_ADMIN },
        },
        select: { createdAt: true },
      }),
      this.prisma.academy.findMany({
        where: { createdAt: { gte: start, lte: endOfDay(end) } },
        select: { createdAt: true },
      }),
    ]);

    const buckets = new Map<string, DailyAnalyticsStatsDto>();
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const key = toDateKey(d);
      buckets.set(key, {
        date: key,
        anonymousVisitors: 0,
        loginCount: 0,
        newSignups: 0,
        newAcademies: 0,
      });
    }

    for (const v of visits) {
      const bucket = buckets.get(toDateKey(v.visitDate));
      if (!bucket) continue;
      if (v.type === VisitorType.ANONYMOUS) bucket.anonymousVisitors = v._count._all;
      else bucket.loginCount = v._count._all;
    }
    for (const u of users) {
      const bucket = buckets.get(toDateKey(u.createdAt));
      if (bucket) bucket.newSignups += 1;
    }
    for (const a of academies) {
      const bucket = buckets.get(toDateKey(a.createdAt));
      if (bucket) bucket.newAcademies += 1;
    }

    return Array.from(buckets.values());
  }
}

function truncateToDate(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn jest src/analytics/analytics.service.spec.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/analytics/dto/daily-analytics-stats.dto.ts src/analytics/analytics.service.ts src/analytics/analytics.service.spec.ts
git commit -m "feat(analytics): add AnalyticsService with visit tracking and stats aggregation"
```

---

### Task 3: `AnalyticsController` + `AnalyticsModule`, wire into `AppModule`

**Files:**
- Create: `src/analytics/dto/track-visit.dto.ts`
- Create: `src/analytics/dto/track-visit-response.dto.ts`
- Create: `src/analytics/dto/analytics-stats-query.dto.ts`
- Create: `src/analytics/analytics.controller.ts`
- Create: `src/analytics/analytics.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `AnalyticsService.trackAnonymousVisit`, `AnalyticsService.getStats` (Task 2). `JwtAuthGuard` (`../common/guards/jwt-auth.guard`), `RolesGuard` (`../common/guards/roles.guard`), `Roles` (`../common/decorators/roles.decorator`) — same imports as `src/calendar/calendar.controller.ts`.
- Produces: `POST /analytics/track` (public), `GET /analytics/stats` (`SUPER_ADMIN`). `AnalyticsModule` exporting `AnalyticsService` for Task 4 to import.

No controller/DTO spec is written here — this matches the existing repo convention noted in `CLAUDE.md` ("controller/DTOs untested, matching this repo's existing convention — `class-logs` has no controller spec either"). Verification is via build + manual route check, not a Jest spec.

- [ ] **Step 1: Create the request/response DTOs**

`src/analytics/dto/track-visit.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TrackVisitDto {
  @ApiProperty({
    description:
      '프론트에서 생성해 로컬(localStorage 등)에 저장하는 익명 방문자 UUID. ' +
      '개인정보가 아니며, 같은 방문자가 재방문 시 동일 값을 재사용한다.',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
  })
  @IsUUID()
  visitorId: string;
}
```

`src/analytics/dto/track-visit-response.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class TrackVisitResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}
```

`src/analytics/dto/analytics-stats-query.dto.ts`:

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class AnalyticsStatsQueryDto {
  @ApiPropertyOptional({
    example: '2026-08-10',
    description: '조회 시작 일자 (YYYY-MM-DD). 생략 시 오늘로부터 29일 전.',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-09-08',
    description: '조회 종료 일자 (YYYY-MM-DD). 생략 시 오늘.',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
```

- [ ] **Step 2: Create the controller**

`src/analytics/analytics.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { TrackVisitDto } from './dto/track-visit.dto';
import { TrackVisitResponseDto } from './dto/track-visit-response.dto';
import { AnalyticsStatsQueryDto } from './dto/analytics-stats-query.dto';
import { DailyAnalyticsStatsDto } from './dto/daily-analytics-stats.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('08. 방문 통계 (Analytics)')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @HttpCode(HttpStatus.OK)
  // 공개 엔드포인트 스팸 방지: 로그인과 동일한 수준으로 제한. 어차피 서버에서
  // dedup되므로 카운트 조작은 안 되지만 무의미한 쓰기 폭주 자체를 막는다.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: '[비인증] 익명 방문 기록',
    description:
      '공개 페이지(랜딩/로그인) 방문 시 프론트가 호출하는 beacon. ' +
      '같은 날 같은 visitorId는 중복 집계되지 않는다.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: TrackVisitResponseDto })
  async track(@Body() dto: TrackVisitDto): Promise<TrackVisitResponseDto> {
    await this.analyticsService.trackAnonymousVisit(dto.visitorId);
    return { success: true };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '날짜별 방문/로그인/가입/학원개설 통계 (SUPER_ADMIN 전용)',
    description:
      '요청한 날짜 범위(기본 최근 30일)를 빈 구간 없이 반환한다.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [DailyAnalyticsStatsDto] })
  async getStats(
    @Query() query: AnalyticsStatsQueryDto,
  ): Promise<DailyAnalyticsStatsDto[]> {
    return this.analyticsService.getStats(query.startDate, query.endDate);
  }
}
```

- [ ] **Step 3: Create the module**

`src/analytics/analytics.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
```

- [ ] **Step 4: Wire `AnalyticsModule` into `AppModule`**

In `src/app.module.ts`, add the import near the other feature module imports:

```typescript
import { AnalyticsModule } from './analytics/analytics.module';
```

And add `AnalyticsModule` to the `imports` array (after `ReportsModule`):

```typescript
    ReportsModule,
    AnalyticsModule,
```

- [ ] **Step 5: Verify the build**

Run: `yarn build`
Expected: `Done` with no TypeScript errors (this catches any DTO/controller wiring mistakes immediately, since there's no controller spec for this module).

- [ ] **Step 6: Commit**

```bash
git add src/analytics/dto/track-visit.dto.ts src/analytics/dto/track-visit-response.dto.ts src/analytics/dto/analytics-stats-query.dto.ts src/analytics/analytics.controller.ts src/analytics/analytics.module.ts src/app.module.ts
git commit -m "feat(analytics): add AnalyticsController and wire AnalyticsModule into AppModule"
```

---

### Task 4: Login hook — record staff visits in `AuthService.login()`

**Files:**
- Modify: `src/auth/auth.module.ts`
- Modify: `src/auth/auth.service.ts`
- Modify: `src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `AnalyticsService.recordStaffVisit(userId: number, academyId: number | null): Promise<void>` (Task 2).
- Produces: no new public interface — internal behavior change to `AuthService.login()`.

- [ ] **Step 1: Write the failing tests**

In `src/auth/auth.service.spec.ts`, add the import at the top of the file, alongside the other imports:

```typescript
import { AnalyticsService } from '../analytics/analytics.service';
```

Find the `describe('AuthService', ...)` block's variable declarations:

```typescript
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
```

Replace with (adding a fourth mock variable, matching the existing `let <name>: any;` convention used by `prisma`/`jwtService`/`configService`):

```typescript
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let analyticsService: any;
```

Find the `beforeEach` block's `prisma = {` assignment and add the new mock assignment right before it:

```typescript
    analyticsService = {
      recordStaffVisit: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
```

Find the `TestingModule` provider list:

```typescript
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
```

Replace it with (adding the `AnalyticsService` provider):

```typescript
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compile();
```

Then, inside the `describe('login', ...)` block, add two new test cases after the existing "퇴사 처리(INACTIVE)된 계정은..." test:

```typescript
    it('로그인 성공 시 방문 기록(recordStaffVisit)을 호출한다', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);

      await service.login({
        email: 'owner@classhelper.kr',
        password: 'password123!',
      });

      expect(analyticsService.recordStaffVisit).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.academyId,
      );
    });

    it('방문 기록이 실패해도 로그인 자체는 성공한다', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);
      analyticsService.recordStaffVisit.mockRejectedValue(new Error('DB down'));

      const result = await service.login({
        email: 'owner@classhelper.kr',
        password: 'password123!',
      });

      expect(result.accessToken).toBe('mocked-access-token');
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn jest src/auth/auth.service.spec.ts`
Expected: FAIL — `Nest can't resolve dependencies of the AuthService (?, ..., AnalyticsService)` (module compile error, since `AuthService` doesn't accept an `AnalyticsService` constructor param yet) or a TS error on the new mock reference — either way, red before green.

- [ ] **Step 3: Inject `AnalyticsService` into `AuthService` and call it in `login()`**

In `src/auth/auth.service.ts`, add the import near the other DTO/service imports:

```typescript
import { AnalyticsService } from '../analytics/analytics.service';
```

Change the constructor from:

```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
```

to:

```typescript
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly analyticsService: AnalyticsService,
  ) {}
```

In the `login()` method, find:

```typescript
    const tokens = await this.getTokens(user);
    await this.updateHashedRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.mapToUserProfile(user),
      academy: this.mapToAcademySummary(user.academy),
    };
  }
```

(this is the one inside `login()`, immediately following the `INACTIVE` check and password comparison — distinguish it from the identical-looking block in `registerOwner()` by the surrounding `login` method context) and replace it with:

```typescript
    const tokens = await this.getTokens(user);
    await this.updateHashedRefreshToken(user.id, tokens.refreshToken);

    // 방문 통계 기록 실패가 로그인 자체를 막아서는 안 된다 — 통계는 부가 기능이다.
    try {
      await this.analyticsService.recordStaffVisit(user.id, user.academyId ?? null);
    } catch (err) {
      this.logger.warn(
        `방문 기록 실패(로그인은 정상 처리됨): ${(err as Error).message}`,
      );
    }

    return {
      ...tokens,
      user: this.mapToUserProfile(user),
      academy: this.mapToAcademySummary(user.academy),
    };
  }
```

- [ ] **Step 4: Wire `AnalyticsModule` into `AuthModule`**

In `src/auth/auth.module.ts`, add the import:

```typescript
import { AnalyticsModule } from '../analytics/analytics.module';
```

Add `AnalyticsModule` to the `imports` array (alongside `PassportModule.register(...)` and `JwtModule.registerAsync(...)`):

```typescript
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      // ...unchanged...
    }),
    AnalyticsModule,
  ],
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn jest src/auth/auth.service.spec.ts`
Expected: PASS, all cases (existing 148 + 2 new = 150).

- [ ] **Step 6: Run the full suite and build**

Run: `yarn build && yarn test`
Expected: build succeeds, all test suites pass.

- [ ] **Step 7: Commit**

```bash
git add src/auth/auth.module.ts src/auth/auth.service.ts src/auth/auth.service.spec.ts
git commit -m "feat(analytics): record staff visits on login without blocking auth on failure"
```

---

### Task 5: Docs + AI_HANDOFF + final verification

**Files:**
- Create: `docs/domains/08-analytics.md`
- Modify: `CLAUDE.md`
- Modify: `../AI_HANDOFF.md`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Write the domain doc**

Create `docs/domains/08-analytics.md`, following the section structure of `docs/domains/06-calendar.md` (entity list, role matrix, API spec). Minimum required content — fill in with the header/title conventions from `06-calendar.md`, but every fact below must appear verbatim (types/paths are not placeholders, copy them exactly):

- **§1 엔티티**: `SiteVisit` — `visitDate`(Date), `type`(`VisitorType`: `ANONYMOUS`/`STAFF`), `dedupKey`(같은 날 같은 값은 1건만 유지), `userId?`, `academyId?`. 학원별 스코프가 없는 유일한 신규 모델(플랫폼 전체 SUPER_ADMIN 전용이라 의도적).
- **§2 역할 매트릭스**: `POST /analytics/track` — 전 역할 및 비인증 모두 가능(공개). `GET /analytics/stats` — `SUPER_ADMIN`만 가능, 나머지 전부 불가.
- **§4 API 명세**:
  - `POST /analytics/track` (비인증): Request `{ "visitorId": "<uuid>" }`, Response `{ "success": true }`, Throttle 60초 5회.
  - `GET /analytics/stats?startDate=&endDate=` (`SUPER_ADMIN`): Response `[{ "date": "2026-09-08", "anonymousVisitors": 42, "loginCount": 15, "newSignups": 3, "newAcademies": 1 }, ...]`, 날짜 생략 시 최근 30일, 빈 날짜도 0으로 채워 반환.
  - 로그인 훅: `AuthService.login()` 성공 시 자동으로 `STAFF` 방문 기록, 실패해도 로그인은 항상 성공(§6 참고).

- [ ] **Step 2: Update `CLAUDE.md`**

Add a new dated entry under "What's actually implemented" (before "## Roadmap status") describing: what was built, why signups/academies needed no new table, the login-hook non-blocking guarantee, test count, migration status (confirm whether `migrate deploy` succeeded against the local DB in Task 1 — state this explicitly either way, do not assume).

- [ ] **Step 3: Update `AI_HANDOFF.md`**

Add a new dated entry (top of "최근 동기화 히스토리") with:
- New endpoints: `POST /analytics/track`, `GET /analytics/stats`
- Frontend integration needed (per spec §10): beacon call from landing/login pages with a locally-generated+cached UUID, and a new admin-portal chart/menu consuming `GET /analytics/stats`
- Note that this is backend-only — no frontend work done in this plan

- [ ] **Step 4: Final full verification**

Run: `yarn build && yarn lint && yarn test`
Expected: build clean, lint 0 errors, all test suites pass (150+ tests).

- [ ] **Step 5: Commit**

```bash
git add docs/domains/08-analytics.md CLAUDE.md ../AI_HANDOFF.md
git commit -m "docs(analytics): document SiteVisit domain and hand off frontend spec"
```
