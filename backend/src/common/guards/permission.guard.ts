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
