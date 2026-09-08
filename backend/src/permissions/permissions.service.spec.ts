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
