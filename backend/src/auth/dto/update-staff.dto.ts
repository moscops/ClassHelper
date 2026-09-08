import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsIn, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateStaffDto {
  @ApiPropertyOptional({ description: '이름', example: '이강사' })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: '이름을 입력해주세요.' })
  name?: string;

  @ApiPropertyOptional({ description: '휴대폰 번호', example: '010-9876-5432' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description:
      '직책/권한 (TEACHER, ADMIN, STAFF만 지정 가능 — OWNER/SUPER_ADMIN으로는 절대 변경할 수 없다)',
    enum: [UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF],
    example: UserRole.TEACHER,
  })
  @IsOptional()
  @IsIn([UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF], {
    message: '직책은 ADMIN, TEACHER, STAFF 중 하나여야 합니다.',
  })
  role?: UserRole;
}
