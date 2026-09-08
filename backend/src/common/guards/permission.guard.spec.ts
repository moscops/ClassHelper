import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole, PermissionModule } from '@prisma/client';
import { PermissionGuard } from './permission.guard';

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
