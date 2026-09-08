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
