import { Injectable } from '@nestjs/common';
import { UserRole, PermissionModule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RolePermissionDto } from './dto/role-permission.dto';

const TARGET_ROLES = [
  UserRole.ADMIN,
  UserRole.TEACHER,
  UserRole.STAFF,
] as const;
const MODULES = Object.values(PermissionModule);

// 이 세션 코드 확인(기존 @Roles() 패턴 근거)에 따른 기본값. OWNER/SUPER_ADMIN은 이
// 맵에 없다 — PermissionGuard가 항상 먼저 걸러내므로 조회될 일이 없다.
const DEFAULTS: Record<
  (typeof TARGET_ROLES)[number],
  Record<PermissionModule, boolean>
> = {
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
