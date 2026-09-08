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
