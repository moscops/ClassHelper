# Role Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let OWNER customize, per role (ADMIN/TEACHER/STAFF), whether that role can edit (vs. only view) within each of 8 existing feature areas — enforced server-side as an additional gate layered under the existing `@Roles()` checks, never widening what a role can already reach.

**Architecture:** A new `RolePermission` table stores per-(academy, role, module) overrides; a lazy-default fallback means academies need no backfill. A new `PermissionGuard` (paired with a `@RequirePermission(module)` decorator) is added to the class-level `@UseGuards()` of 8 existing controllers and applied to their specific mutating routes; `OWNER`/`SUPER_ADMIN` always bypass it. A new `GET/PATCH /auth/role-permissions` pair (in a new self-contained `permissions` module, globally providing `PermissionsService` so the guard resolves everywhere without per-module imports) lets OWNER read/edit the matrix.

**Tech Stack:** NestJS 11, Prisma 7 (PostgreSQL), class-validator, Jest.

**Spec:** `backend/docs/superpowers/specs/2026-09-08-role-permissions-design.md`

## Global Constraints

- `OWNER`/`SUPER_ADMIN` are never subject to `RolePermission` — the guard bypasses them unconditionally (spec §2).
- `PermissionGuard` only narrows *within* what `@Roles()` already allows; it never grants access `@Roles()` denies (spec §2). It is added at the *class* level of each of the 8 controllers (all already use `@UseGuards(JwtAuthGuard, RolesGuard)` at class level) — a route with no `@RequirePermission()` passes through unaffected.
- Target modules (exactly 8, `PermissionModule` enum): `STUDENTS`, `CLASSES`, `ATTENDANCE`, `CLASS_LOGS`, `TUITION`, `CALENDAR`, `NOTIFICATIONS`, `REPORTS` (spec §2/§3).
- Excluded from the toggle system entirely: staff management (`auth`), `admin` module, and notification read-status endpoints (`PATCH /notifications/:id/read`, `PATCH /notifications/read-all` — personal inbox state, not a "menu edit") (spec §2/§5).
- Default matrix values (spec §4) — ADMIN is `true` (edit) for all 8 modules; TEACHER is `true` only for `ATTENDANCE`/`CLASS_LOGS`/`REPORTS`, else `false`; STAFF is `true` only for `ATTENDANCE`, else `false`.
- `role` field in any request DTO touching `RolePermission` must reject `OWNER`/`SUPER_ADMIN` (`400`) — same privilege-escalation-prevention pattern already used for `RegisterStaffDto`/`UpdateStaffDto`/`JoinStaffDto` in this codebase.
- Working directory for all commands below: `/home/joshywoshy/ClassHelper/backend`.

---

### Task 1: Prisma schema + migration for `RolePermission`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260908070000_add_role_permissions/migration.sql`

**Interfaces:**
- Produces: Prisma model `RolePermission { id: Int, academyId: Int, role: UserRole, module: PermissionModule, canEdit: Boolean, createdAt, updatedAt }`, enum `PermissionModule { STUDENTS, CLASSES, ATTENDANCE, CLASS_LOGS, TUITION, CALENDAR, NOTIFICATIONS, REPORTS }`. Compound unique `academyId_role_module` (Prisma's auto-generated name for `@@unique([academyId, role, module])`).

- [ ] **Step 1: Add `PermissionModule` enum and `RolePermission` model to `prisma/schema.prisma`**

Add this enum near the other small enums (e.g. right after `enum VisitorType`):

```prisma
enum PermissionModule {
  STUDENTS
  CLASSES
  ATTENDANCE
  CLASS_LOGS
  TUITION
  CALENDAR
  NOTIFICATIONS
  REPORTS
}
```

Add this model after the `SiteVisit` model:

```prisma
model RolePermission {
  id        Int              @id @default(autoincrement())
  academyId Int
  // 애플리케이션(DTO) 레벨에서 ADMIN/TEACHER/STAFF만 허용 — OWNER/SUPER_ADMIN은 이
  // 시스템의 토글 대상이 아니다(항상 전권이며 조회조차 이 테이블을 거치지 않는다).
  role      UserRole
  module    PermissionModule
  canEdit   Boolean          @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  academy Academy @relation(fields: [academyId], references: [id], onDelete: Cascade)

  @@unique([academyId, role, module])
  @@index([academyId])
  @@map("role_permissions")
}
```

In the `Academy` model, add the back-relation field (alongside the other relation array fields, e.g. right after `siteVisits SiteVisit[]`):

```prisma
  rolePermissions RolePermission[]
```

- [ ] **Step 2: Write the migration SQL**

Create `prisma/migrations/20260908070000_add_role_permissions/migration.sql`:

```sql
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
```

- [ ] **Step 3: Regenerate the Prisma client**

Run: `yarn prisma:generate`
Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Apply the migration to the local dev DB and verify**

Run: `yarn prisma:migrate:deploy`
Expected: `Applying migration \`20260908070000_add_role_permissions\`` then `All migrations have been successfully applied.`

Run: `yarn prisma migrate status`
Expected: `Database schema is up to date!`

(If the local DB is unreachable, state that explicitly — do not skip silently, per the earlier session's local-login-500 incident caused by exactly this being skipped.)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260908070000_add_role_permissions/
git commit -m "feat(permissions): add RolePermission model and migration"
```

---

### Task 2: `PermissionsService` (TDD)

**Files:**
- Create: `src/permissions/dto/role-permission.dto.ts`
- Create: `src/permissions/permissions.service.ts`
- Test: `src/permissions/permissions.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` (from `../prisma/prisma.service`), Prisma `UserRole`/`PermissionModule` enums (from `@prisma/client`).
- Produces:
  - `RolePermissionDto { role: UserRole; module: PermissionModule; canEdit: boolean; }`
  - `PermissionsService.canEdit(academyId: number, role: UserRole, module: PermissionModule): Promise<boolean>`
  - `PermissionsService.getMatrix(academyId: number): Promise<RolePermissionDto[]>` — always returns exactly 24 entries (3 target roles × 8 modules).
  - `PermissionsService.updateMatrix(academyId: number, items: { role: UserRole; module: PermissionModule; canEdit: boolean }[]): Promise<RolePermissionDto[]>`

- [ ] **Step 1: Create the response DTO**

`src/permissions/dto/role-permission.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, PermissionModule } from '@prisma/client';

export class RolePermissionDto {
  @ApiProperty({
    enum: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF],
    example: UserRole.TEACHER,
  })
  role: UserRole;

  @ApiProperty({ enum: PermissionModule, example: PermissionModule.ATTENDANCE })
  module: PermissionModule;

  @ApiProperty({ example: true })
  canEdit: boolean;
}
```

- [ ] **Step 2: Write the failing tests**

`src/permissions/permissions.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, PermissionModule } from '@prisma/client';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      rolePermission: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canEdit', () => {
    it('오버라이드 행이 있으면 그 값을 반환한다', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue({ canEdit: false });

      const result = await service.canEdit(10, UserRole.ADMIN, PermissionModule.STUDENTS);

      expect(result).toBe(false);
      expect(prisma.rolePermission.findUnique).toHaveBeenCalledWith({
        where: {
          academyId_role_module: {
            academyId: 10,
            role: UserRole.ADMIN,
            module: PermissionModule.STUDENTS,
          },
        },
      });
    });

    it('오버라이드가 없으면 기본값으로 폴백한다 (TEACHER + ATTENDANCE = true)', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue(null);

      const result = await service.canEdit(10, UserRole.TEACHER, PermissionModule.ATTENDANCE);

      expect(result).toBe(true);
    });

    it('오버라이드가 없으면 기본값으로 폴백한다 (TEACHER + TUITION = false)', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue(null);

      const result = await service.canEdit(10, UserRole.TEACHER, PermissionModule.TUITION);

      expect(result).toBe(false);
    });

    it('오버라이드가 없으면 기본값으로 폴백한다 (STAFF + ATTENDANCE = true, 그 외는 false)', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue(null);

      expect(await service.canEdit(10, UserRole.STAFF, PermissionModule.ATTENDANCE)).toBe(true);
      expect(await service.canEdit(10, UserRole.STAFF, PermissionModule.CLASS_LOGS)).toBe(false);
    });

    it('ADMIN은 모든 모듈이 기본값 true다', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue(null);

      for (const module of Object.values(PermissionModule)) {
        expect(await service.canEdit(10, UserRole.ADMIN, module)).toBe(true);
      }
    });
  });

  describe('getMatrix', () => {
    it('3개 역할 x 8개 모듈 = 24개 항목을 항상 전부 반환한다', async () => {
      prisma.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.getMatrix(10);

      expect(result).toHaveLength(24);
    });

    it('오버라이드가 있으면 기본값 대신 오버라이드 값을 사용한다', async () => {
      prisma.rolePermission.findMany.mockResolvedValue([
        { role: UserRole.TEACHER, module: PermissionModule.STUDENTS, canEdit: true },
      ]);

      const result = await service.getMatrix(10);

      const entry = result.find(
        (r) => r.role === UserRole.TEACHER && r.module === PermissionModule.STUDENTS,
      );
      expect(entry?.canEdit).toBe(true);
    });
  });

  describe('updateMatrix', () => {
    it('전달된 각 항목을 upsert하고 갱신된 전체 매트릭스를 반환한다', async () => {
      prisma.rolePermission.upsert.mockResolvedValue({});
      prisma.rolePermission.findMany.mockResolvedValue([
        { role: UserRole.TEACHER, module: PermissionModule.TUITION, canEdit: true },
      ]);

      const result = await service.updateMatrix(10, [
        { role: UserRole.TEACHER, module: PermissionModule.TUITION, canEdit: true },
      ]);

      expect(prisma.rolePermission.upsert).toHaveBeenCalledWith({
        where: {
          academyId_role_module: {
            academyId: 10,
            role: UserRole.TEACHER,
            module: PermissionModule.TUITION,
          },
        },
        create: {
          academyId: 10,
          role: UserRole.TEACHER,
          module: PermissionModule.TUITION,
          canEdit: true,
        },
        update: { canEdit: true },
      });
      expect(result).toHaveLength(24);
    });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `yarn jest src/permissions/permissions.service.spec.ts`
Expected: FAIL — `Cannot find module './permissions.service'` (file doesn't exist yet).

- [ ] **Step 4: Implement `PermissionsService`**

`src/permissions/permissions.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { UserRole, PermissionModule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RolePermissionDto } from './dto/role-permission.dto';

const TARGET_ROLES = [UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF] as const;
const MODULES = Object.values(PermissionModule);

// 이 세션 코드 확인(§4 근거)에 따른 기본값. OWNER/SUPER_ADMIN은 이 맵에 없다 —
// 가드에서 항상 먼저 걸러지므로 조회될 일이 없다.
const DEFAULTS: Record<(typeof TARGET_ROLES)[number], Record<PermissionModule, boolean>> = {
  [UserRole.ADMIN]: {
    STUDENTS: true,
    CLASSES: true,
    ATTENDANCE: true,
    CLASS_LOGS: true,
    TUITION: true,
    CALENDAR: true,
    NOTIFICATIONS: true,
    REPORTS: true,
  },
  [UserRole.TEACHER]: {
    STUDENTS: false,
    CLASSES: false,
    ATTENDANCE: true,
    CLASS_LOGS: true,
    TUITION: false,
    CALENDAR: false,
    NOTIFICATIONS: false,
    REPORTS: true,
  },
  [UserRole.STAFF]: {
    STUDENTS: false,
    CLASSES: false,
    ATTENDANCE: true,
    CLASS_LOGS: false,
    TUITION: false,
    CALENDAR: false,
    NOTIFICATIONS: false,
    REPORTS: false,
  },
};

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ADMIN/TEACHER/STAFF에 대해서만 호출된다(OWNER/SUPER_ADMIN은 PermissionGuard가
   * 먼저 통과시킨다). RolePermission 오버라이드가 있으면 그 값, 없으면 기본값.
   */
  async canEdit(
    academyId: number,
    role: UserRole,
    module: PermissionModule,
  ): Promise<boolean> {
    const override = await this.prisma.rolePermission.findUnique({
      where: { academyId_role_module: { academyId, role, module } },
    });
    if (override) return override.canEdit;
    return DEFAULTS[role as (typeof TARGET_ROLES)[number]]?.[module] ?? false;
  }

  /**
   * 3역할 x 8모듈 = 24개 항목을 항상 전부 채워 반환한다(프론트가 기본값 로직을
   * 몰라도 되도록).
   */
  async getMatrix(academyId: number): Promise<RolePermissionDto[]> {
    const overrides = await this.prisma.rolePermission.findMany({
      where: { academyId },
    });
    const overrideMap = new Map(
      overrides.map((o) => [`${o.role}:${o.module}`, o.canEdit]),
    );

    const result: RolePermissionDto[] = [];
    for (const role of TARGET_ROLES) {
      for (const module of MODULES) {
        const key = `${role}:${module}`;
        const canEdit = overrideMap.has(key)
          ? (overrideMap.get(key) as boolean)
          : DEFAULTS[role][module];
        result.push({ role, module, canEdit });
      }
    }
    return result;
  }

  /**
   * 전달된 항목만 upsert한다(변경 안 된 조합은 계속 기본값 폴백으로 남는다).
   */
  async updateMatrix(
    academyId: number,
    items: { role: UserRole; module: PermissionModule; canEdit: boolean }[],
  ): Promise<RolePermissionDto[]> {
    await Promise.all(
      items.map((item) =>
        this.prisma.rolePermission.upsert({
          where: {
            academyId_role_module: {
              academyId,
              role: item.role,
              module: item.module,
            },
          },
          create: {
            academyId,
            role: item.role,
            module: item.module,
            canEdit: item.canEdit,
          },
          update: { canEdit: item.canEdit },
        }),
      ),
    );
    return this.getMatrix(academyId);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn jest src/permissions/permissions.service.spec.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/permissions/dto/role-permission.dto.ts src/permissions/permissions.service.ts src/permissions/permissions.service.spec.ts
git commit -m "feat(permissions): add PermissionsService with lazy-default matrix"
```

---

### Task 3: `RequirePermission` decorator + `PermissionGuard` (TDD)

**Files:**
- Create: `src/common/decorators/require-permission.decorator.ts`
- Create: `src/common/guards/permission.guard.ts`
- Test: `src/common/guards/permission.guard.spec.ts`

**Interfaces:**
- Consumes: `PermissionsService.canEdit` (Task 2), `CurrentUserPayload` (`../decorators/current-user.decorator`).
- Produces: `RequirePermission(module: PermissionModule)` method decorator; `PermissionGuard` (implements `CanActivate`) — to be added to `@UseGuards()` alongside `JwtAuthGuard`/`RolesGuard` in Task 5.

- [ ] **Step 1: Create the decorator**

`src/common/decorators/require-permission.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { PermissionModule } from '@prisma/client';

export const PERMISSION_MODULE_KEY = 'permissionModule';
export const RequirePermission = (module: PermissionModule) =>
  SetMetadata(PERMISSION_MODULE_KEY, module);
```

- [ ] **Step 2: Write the failing tests**

`src/common/guards/permission.guard.spec.ts`:

```typescript
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, PermissionModule } from '@prisma/client';
import { PermissionGuard } from './permission.guard';
import { PermissionsService } from '../../permissions/permissions.service';
import { PERMISSION_MODULE_KEY } from '../decorators/require-permission.decorator';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: any;
  let permissionsService: any;

  const buildContext = (user: any): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    permissionsService = { canEdit: jest.fn() };
    guard = new PermissionGuard(reflector, permissionsService);
  });

  it('@RequirePermission이 없는 라우트는 항상 통과시킨다', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(buildContext({ role: UserRole.TEACHER }));

    expect(result).toBe(true);
    expect(permissionsService.canEdit).not.toHaveBeenCalled();
  });

  it('OWNER는 PermissionsService를 조회하지 않고 항상 통과한다', async () => {
    reflector.getAllAndOverride.mockReturnValue(PermissionModule.STUDENTS);

    const result = await guard.canActivate(
      buildContext({ role: UserRole.OWNER, academyId: 10 }),
    );

    expect(result).toBe(true);
    expect(permissionsService.canEdit).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN도 항상 통과한다', async () => {
    reflector.getAllAndOverride.mockReturnValue(PermissionModule.STUDENTS);

    const result = await guard.canActivate(
      buildContext({ role: UserRole.SUPER_ADMIN, academyId: null }),
    );

    expect(result).toBe(true);
  });

  it('TEACHER는 PermissionsService.canEdit 결과를 따른다 (true)', async () => {
    reflector.getAllAndOverride.mockReturnValue(PermissionModule.ATTENDANCE);
    permissionsService.canEdit.mockResolvedValue(true);

    const result = await guard.canActivate(
      buildContext({ role: UserRole.TEACHER, academyId: 10 }),
    );

    expect(result).toBe(true);
    expect(permissionsService.canEdit).toHaveBeenCalledWith(
      10,
      UserRole.TEACHER,
      PermissionModule.ATTENDANCE,
    );
  });

  it('TEACHER는 PermissionsService.canEdit이 false면 ForbiddenException을 던진다', async () => {
    reflector.getAllAndOverride.mockReturnValue(PermissionModule.TUITION);
    permissionsService.canEdit.mockResolvedValue(false);

    await expect(
      guard.canActivate(buildContext({ role: UserRole.TEACHER, academyId: 10 })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('인증 정보가 없으면 ForbiddenException을 던진다', async () => {
    reflector.getAllAndOverride.mockReturnValue(PermissionModule.STUDENTS);

    await expect(guard.canActivate(buildContext(undefined))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `yarn jest src/common/guards/permission.guard.spec.ts`
Expected: FAIL — `Cannot find module './permission.guard'`.

- [ ] **Step 4: Implement `PermissionGuard`**

`src/common/guards/permission.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, PermissionModule } from '@prisma/client';
import { PERMISSION_MODULE_KEY } from '../decorators/require-permission.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { PermissionsService } from '../../permissions/permissions.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const module = this.reflector.getAllAndOverride<PermissionModule | undefined>(
      PERMISSION_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!module) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: CurrentUserPayload }>();

    if (!user) {
      throw new ForbiddenException('인증 정보가 유효하지 않습니다.');
    }

    // OWNER/SUPER_ADMIN은 항상 전권 — 이 시스템의 토글 대상이 아니다.
    if (user.role === UserRole.OWNER || user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (!user.academyId) {
      throw new ForbiddenException('해당 작업에 대한 접근 권한이 없습니다.');
    }

    const canEdit = await this.permissionsService.canEdit(
      user.academyId,
      user.role,
      module,
    );
    if (!canEdit) {
      throw new ForbiddenException(
        '원장이 이 메뉴에 대한 수정 권한을 아직 부여하지 않았습니다.',
      );
    }
    return true;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn jest src/common/guards/permission.guard.spec.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/common/decorators/require-permission.decorator.ts src/common/guards/permission.guard.ts src/common/guards/permission.guard.spec.ts
git commit -m "feat(permissions): add RequirePermission decorator and PermissionGuard"
```

---

### Task 4: `PermissionsModule` + `GET/PATCH /auth/role-permissions`, wire into `AppModule`

**Files:**
- Create: `src/permissions/dto/update-role-permissions.dto.ts`
- Create: `src/permissions/permissions.controller.ts`
- Create: `src/permissions/permissions.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `PermissionsService.getMatrix`/`updateMatrix` (Task 2). `JwtAuthGuard`, `RolesGuard`, `Roles`, `CurrentUser` — same imports every other controller in this codebase already uses.
- Produces: `GET /auth/role-permissions` (`OWNER`, `ADMIN`), `PATCH /auth/role-permissions` (`OWNER`). `PermissionsModule` is `@Global()` so `PermissionsService` (and therefore `PermissionGuard`, which depends on it) resolves in every other module in Task 5 without those modules needing to import `PermissionsModule` — this mirrors how `PrismaModule` is already `@Global()` in this codebase.

No controller/DTO spec is written here — matches this repo's existing convention (see `CLAUDE.md`: "controller/DTOs untested ... `class-logs` has no controller spec either"). Verified via build instead.

- [ ] **Step 1: Create the update request DTO**

`src/permissions/dto/update-role-permissions.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { UserRole, PermissionModule } from '@prisma/client';

export class UpdateRolePermissionItemDto {
  @ApiProperty({
    description: 'ADMIN/TEACHER/STAFF만 가능 — OWNER/SUPER_ADMIN은 이 시스템의 대상이 아니다.',
    enum: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF],
    example: UserRole.TEACHER,
  })
  @IsIn([UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF], {
    message: 'role은 ADMIN, TEACHER, STAFF 중 하나여야 합니다.',
  })
  role: UserRole;

  @ApiProperty({ enum: PermissionModule, example: PermissionModule.TUITION })
  @IsEnum(PermissionModule)
  module: PermissionModule;

  @ApiProperty({ example: false })
  @IsBoolean()
  canEdit: boolean;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: '변경할 항목만 전달하면 된다(전체 24개를 매번 보낼 필요 없음).',
    type: [UpdateRolePermissionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRolePermissionItemDto)
  permissions: UpdateRolePermissionItemDto[];
}
```

- [ ] **Step 2: Create the controller**

`src/permissions/permissions.controller.ts`:

```typescript
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RolePermissionDto } from './dto/role-permission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('09. 역할별 커스텀 권한 (Role Permissions)')
@Controller('auth/role-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '역할별 권한 매트릭스 조회 (원장/실장)',
    description: 'ADMIN/TEACHER/STAFF x 8개 메뉴 = 24개 항목을 항상 전부 반환한다(미설정은 기본값으로 채움).',
  })
  @ApiResponse({ status: 200, type: [RolePermissionDto] })
  async getMatrix(
    @CurrentUser('academyId') academyId: number,
  ): Promise<RolePermissionDto[]> {
    return this.permissionsService.getMatrix(academyId);
  }

  @Patch()
  @Roles(UserRole.OWNER)
  @ApiOperation({
    summary: '역할별 권한 매트릭스 변경 (원장 전용)',
    description: '변경할 항목만 전달하면 된다. 실장은 조회는 가능하지만 변경은 원장만 할 수 있다.',
  })
  @ApiResponse({ status: 200, type: [RolePermissionDto] })
  async updateMatrix(
    @CurrentUser('academyId') academyId: number,
    @Body() dto: UpdateRolePermissionsDto,
  ): Promise<RolePermissionDto[]> {
    return this.permissionsService.updateMatrix(academyId, dto.permissions);
  }
}
```

- [ ] **Step 3: Create the module**

`src/permissions/permissions.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
```

- [ ] **Step 4: Wire `PermissionsModule` into `AppModule`**

In `src/app.module.ts`, add the import near the other feature module imports:

```typescript
import { PermissionsModule } from './permissions/permissions.module';
```

Add `PermissionsModule` to the `imports` array (after `AnalyticsModule`):

```typescript
    AnalyticsModule,
    PermissionsModule,
```

- [ ] **Step 5: Verify the build**

Run: `yarn build`
Expected: `Done` with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/permissions/dto/update-role-permissions.dto.ts src/permissions/permissions.controller.ts src/permissions/permissions.module.ts src/app.module.ts
git commit -m "feat(permissions): add PermissionsController and wire PermissionsModule (global) into AppModule"
```

---

### Task 5: Apply `PermissionGuard` + `@RequirePermission()` across the 8 target controllers

**Files:**
- Modify: `src/students/students.controller.ts`
- Modify: `src/classes/classes.controller.ts`
- Modify: `src/attendance/attendance.controller.ts`
- Modify: `src/class-logs/class-logs.controller.ts`
- Modify: `src/tuition/tuition.controller.ts`
- Modify: `src/calendar/calendar.controller.ts`
- Modify: `src/notifications/notifications.controller.ts`
- Modify: `src/reports/reports.controller.ts`

**Interfaces:**
- Consumes: `PermissionGuard` (Task 3, `../common/guards/permission.guard`), `RequirePermission` (Task 3, `../common/decorators/require-permission.decorator`), `PermissionModule` enum (`@prisma/client`).
- Produces: no new interface — adds an additional gate to existing routes.

All 8 controllers currently have identical class-level `@UseGuards(JwtAuthGuard, RolesGuard)` (verified by inspection — each file has exactly one `@UseGuards` line, at the class, right above `export class ...Controller`). For **every** file below:

1. Add two imports (adjust the relative path prefix if the file is not directly under `src/<module>/`; all 8 files here are one level deep, so `../common/...` is correct for all of them):
   ```typescript
   import { PermissionGuard } from '../common/guards/permission.guard';
   import { RequirePermission } from '../common/decorators/require-permission.decorator';
   ```
2. Add `PermissionModule` to the existing `import { UserRole } from '@prisma/client';` line (becomes `import { UserRole, PermissionModule } from '@prisma/client';`) — or to whatever existing `@prisma/client` import line the file already has (some import `EnrollmentStatus, UserRole` etc. — add `PermissionModule` to that same line).
3. Change `@UseGuards(JwtAuthGuard, RolesGuard)` to `@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)`.
4. For each route listed in the table for that file, insert `@RequirePermission(PermissionModule.X)` on the line immediately after that route's existing `@Roles(...)` decorator (after the closing `)` of `@Roles(...)`, whether it's single-line or multi-line).

**Correction found during execution**: `students.controller.spec.ts` and `classes.controller.spec.ts` DO exist (the "no controller spec convention" claim in `CLAUDE.md` was stale/incomplete) and construct an isolated `TestingModule` with only `{ controllers: [X], providers: [XService] }` — no `PermissionsModule` import. Since `@Global()` modules are not automatically pulled into a separately-compiled `TestingModule`, `PermissionGuard`'s `PermissionsService` dependency fails to resolve there (`Nest can't resolve dependencies of the PermissionGuard`). Fix: add a mocked `PermissionsService` provider (`{ canEdit: jest.fn().mockResolvedValue(true) }`) to both spec files' `providers` array. The guard's own unit tests (Task 3) already cover its actual logic in isolation — this mock only needs to satisfy DI, not exercise real permission logic.

- [ ] **Step 1: `src/students/students.controller.ts`**

| Route | Insert after |
| :--- | :--- |
| `POST /students` | `@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF)` on the `create` handler → `@RequirePermission(PermissionModule.STUDENTS)` |
| `PATCH /students/:id` | `@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)` on `update` → `@RequirePermission(PermissionModule.STUDENTS)` |
| `PATCH /students/:id/status` | `@Roles(UserRole.OWNER, UserRole.ADMIN)` on the status-update handler → `@RequirePermission(PermissionModule.STUDENTS)` |
| `DELETE /students/:id` | `@Roles(UserRole.OWNER, UserRole.ADMIN)` on `remove`/`delete` → `@RequirePermission(PermissionModule.STUDENTS)` |
| `POST /students/bulk-import` | `@Roles(UserRole.OWNER, UserRole.ADMIN)` on the bulk-import handler → `@RequirePermission(PermissionModule.STUDENTS)` |

- [ ] **Step 2: `src/classes/classes.controller.ts`**

| Route | Insert after |
| :--- | :--- |
| `POST /classes` | `@Roles(UserRole.OWNER, UserRole.ADMIN)` on `create` → `@RequirePermission(PermissionModule.CLASSES)` |
| `PATCH /classes/:id` | `@Roles(UserRole.OWNER, UserRole.ADMIN)` on `update` → `@RequirePermission(PermissionModule.CLASSES)` |
| `DELETE /classes/:id` | `@Roles(UserRole.OWNER)` on `remove` → `@RequirePermission(PermissionModule.CLASSES)` |
| `POST /classes/:classId/enrollments` | `@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)` on the enroll handler → `@RequirePermission(PermissionModule.CLASSES)` |
| `PATCH /classes/enrollments/:enrollmentId` | `@Roles(UserRole.OWNER, UserRole.ADMIN)` → `@RequirePermission(PermissionModule.CLASSES)` |
| `DELETE /classes/enrollments/:enrollmentId` | `@Roles(UserRole.OWNER, UserRole.ADMIN)` → `@RequirePermission(PermissionModule.CLASSES)` |

- [ ] **Step 3: `src/attendance/attendance.controller.ts`**

| Route | Insert after |
| :--- | :--- |
| `POST /attendance/record` | the multi-line `@Roles(SUPER_ADMIN, OWNER, ADMIN, TEACHER, STAFF)` closing `)` on the `record` handler → `@RequirePermission(PermissionModule.ATTENDANCE)` |
| `POST /attendance/batch` | same pattern on `batch` → `@RequirePermission(PermissionModule.ATTENDANCE)` |
| `POST /attendance/quick-check` | same pattern on `quickCheck` → `@RequirePermission(PermissionModule.ATTENDANCE)` |
| `PATCH /attendance/:id/makeup` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)` → `@RequirePermission(PermissionModule.ATTENDANCE)` |
| `DELETE /attendance/:id` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)` → `@RequirePermission(PermissionModule.ATTENDANCE)` |
| `POST /attendance/trigger-unattended-alerts` | the multi-line `@Roles(...)` on this handler → `@RequirePermission(PermissionModule.ATTENDANCE)` |

Do **not** touch `POST /attendance/kiosk-token` (stays `ADMIN`+-only via `@Roles()` alone, not part of this feature per spec §5) or `AttendanceKioskController` (separate file, no guards at all, out of scope).

- [ ] **Step 4: `src/class-logs/class-logs.controller.ts`**

| Route | Insert after |
| :--- | :--- |
| `POST /class-logs` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)` on `create` → `@RequirePermission(PermissionModule.CLASS_LOGS)` |
| `PATCH /class-logs/:id` | same roles on `update` → `@RequirePermission(PermissionModule.CLASS_LOGS)` |
| `DELETE /class-logs/:id` | same roles on `remove` → `@RequirePermission(PermissionModule.CLASS_LOGS)` |
| `PATCH /class-logs/:id/homework-submissions` | same roles on the homework handler → `@RequirePermission(PermissionModule.CLASS_LOGS)` |

- [ ] **Step 5: `src/tuition/tuition.controller.ts`**

| Route | Insert after |
| :--- | :--- |
| `POST /tuition/invoices/generate` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)` → `@RequirePermission(PermissionModule.TUITION)` |
| `PATCH /tuition/invoices/:id` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)` → `@RequirePermission(PermissionModule.TUITION)` |
| `PATCH /tuition/invoices/:id/void` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)` → `@RequirePermission(PermissionModule.TUITION)` |
| `POST /tuition/invoices/:id/payments` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)` → `@RequirePermission(PermissionModule.TUITION)` |
| `POST /tuition/invoices/:id/send-reminder` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)` → `@RequirePermission(PermissionModule.TUITION)` |

- [ ] **Step 6: `src/calendar/calendar.controller.ts`**

| Route | Insert after |
| :--- | :--- |
| `POST /calendar/events` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)` → `@RequirePermission(PermissionModule.CALENDAR)` |
| `PATCH /calendar/events/:id` | same → `@RequirePermission(PermissionModule.CALENDAR)` |
| `DELETE /calendar/events/:id` | same → `@RequirePermission(PermissionModule.CALENDAR)` |

- [ ] **Step 7: `src/notifications/notifications.controller.ts`**

| Route | Insert after |
| :--- | :--- |
| `DELETE /notifications/:id` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)` → `@RequirePermission(PermissionModule.NOTIFICATIONS)` |
| `POST /notifications/:id/retry` | `@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)` → `@RequirePermission(PermissionModule.NOTIFICATIONS)` |

Do **not** touch `PATCH /notifications/:id/read` or `PATCH /notifications/read-all` — excluded per spec §5 (personal inbox state, always allowed to whoever can already see notifications).

- [ ] **Step 8: `src/reports/reports.controller.ts`**

This controller has `@Roles(...)` at the **class** level, not per-method (`@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)` sits above `export class ReportsController`). Add `@RequirePermission(PermissionModule.REPORTS)` at the method level on both mutating handlers only (not the class, and not the `GET students/:id` preview handler which is read-only):

| Route | Insert |
| :--- | :--- |
| `POST /reports/students/:id/send` | `@RequirePermission(PermissionModule.REPORTS)` directly above the handler method |
| `POST /reports/classes/:id/send` | `@RequirePermission(PermissionModule.REPORTS)` directly above the handler method |

- [ ] **Step 9: Full verification**

Run: `yarn build`
Expected: `Done`, no TypeScript errors (this also validates that `PermissionGuard`'s dependency on `PermissionsService` resolves correctly via the `@Global()` `PermissionsModule` from Task 4 — a DI wiring mistake here would surface as a Nest bootstrap error, not a compile error, so also run the app briefly).

Run: `yarn start:dev &` then wait ~5s and check it logs `Nest application successfully started` (or equivalent) with no `UnknownDependenciesException`, then stop it. If a full manual run isn't practical in this environment, at minimum confirm `yarn build` is clean and rely on Task 6's test run to catch DI errors (Nest's `TestingModule.compile()` in any spec that instantiates affected services will also surface `UnknownDependenciesException` if wiring is wrong).

Run: `yarn test`
Expected: all existing suites still pass (this task touches no service logic, only controller decorators — a regression here would mean a typo broke a route, not a logic change).

- [ ] **Step 10: Commit**

```bash
git add src/students/students.controller.ts src/classes/classes.controller.ts src/attendance/attendance.controller.ts src/class-logs/class-logs.controller.ts src/tuition/tuition.controller.ts src/calendar/calendar.controller.ts src/notifications/notifications.controller.ts src/reports/reports.controller.ts
git commit -m "feat(permissions): apply PermissionGuard across 8 target controllers' mutating routes"
```

---

### Task 6: Docs + AI_HANDOFF + final verification

**Files:**
- Create: `docs/domains/09-role-permissions.md`
- Modify: `CLAUDE.md`
- Modify: `../AI_HANDOFF.md`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Write the domain doc**

Create `docs/domains/09-role-permissions.md`, following the section structure of `docs/domains/08-analytics.md`. Required content (exact facts, not placeholders):

- **§1 엔티티**: `RolePermission` — `academyId`, `role`(`ADMIN`/`TEACHER`/`STAFF`만), `module`(`PermissionModule` 8종), `canEdit`. `@@unique([academyId, role, module])`. 오버라이드 없으면 하드코딩된 기본값(§4 표, 아래와 동일)으로 폴백.
- **§2 역할 매트릭스**: `GET /auth/role-permissions` — `OWNER`/`ADMIN` 가능. `PATCH /auth/role-permissions` — `OWNER`만.
- **§4 API 명세**:
  - `GET /auth/role-permissions`: Response `RolePermissionDto[]`(24개 고정).
  - `PATCH /auth/role-permissions`: Request `{ "permissions": [{ "role": "TEACHER", "module": "TUITION", "canEdit": true }] }`, Response 갱신된 24개 전체.
  - 기본값 표(스펙 §4와 동일하게 재수록): ADMIN 전 모듈 true / TEACHER는 ATTENDANCE·CLASS_LOGS·REPORTS만 true / STAFF는 ATTENDANCE만 true.
  - `PermissionGuard`가 적용된 정확한 엔드포인트 목록(스펙 §5 표를 그대로 재수록).

- [ ] **Step 2: Update `CLAUDE.md`**

Add a new dated entry under "What's actually implemented" (before "## Roadmap status") describing: what was built, the lazy-default design choice and why, the exact default matrix and its code-derived rationale, test counts, migration status (state whether `migrate deploy` succeeded against the local DB in Task 1 explicitly).

- [ ] **Step 3: Update `AI_HANDOFF.md`**

Add a new dated entry (top of "최근 동기화 히스토리") with:
- New endpoints: `GET/PATCH /auth/role-permissions`
- Frontend integration needed: "권한 설정" 버튼/매트릭스 UI in 교직원 관리, per spec §9 — including that `403` from any of the 8 modules' mutating actions may now mean "role lacks permission," not just "role type wrong," so error messages/toasts should surface the guard's message text rather than a generic "권한 없음."
- Explicitly note this is backend-only — no frontend work done in this plan.

- [ ] **Step 4: Final full verification**

Run: `yarn build && yarn lint && yarn test`
Expected: build clean, lint 0 errors, all test suites pass.

- [ ] **Step 5: Commit**

```bash
git add docs/domains/09-role-permissions.md CLAUDE.md ../AI_HANDOFF.md
git commit -m "docs(permissions): document RolePermission domain and hand off frontend spec"
```
