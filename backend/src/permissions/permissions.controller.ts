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
    description:
      'ADMIN/TEACHER/STAFF x 8개 메뉴 = 24개 항목을 항상 전부 반환한다(미설정은 기본값으로 채움).',
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
    description:
      '변경할 항목만 전달하면 된다. 실장은 조회는 가능하지만 변경은 원장만 할 수 있다.',
  })
  @ApiResponse({ status: 200, type: [RolePermissionDto] })
  async updateMatrix(
    @CurrentUser('academyId') academyId: number,
    @Body() dto: UpdateRolePermissionsDto,
  ): Promise<RolePermissionDto[]> {
    return this.permissionsService.updateMatrix(academyId, dto.permissions);
  }
}
