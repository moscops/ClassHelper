import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class JoinStaffDto {
  @ApiProperty({
    description: '원장/실장에게 전달받은 학원 자가입 코드',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty({ message: '학원 코드를 입력해주세요.' })
  code: string;

  @ApiProperty({
    description: '이메일 (로그인 ID)',
    example: 'teacher2@classhelper.kr',
  })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;

  @ApiProperty({
    description:
      '비밀번호 (8자 이상, 영문/숫자/특수문자 포함) — 본인이 직접 지정한다.',
    example: 'Teacher123!',
  })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @Matches(
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/,
    {
      message:
        '비밀번호는 영문, 숫자, 특수문자(!@#$%^&* 등)를 모두 포함하여 8자 이상이어야 합니다.',
    },
  )
  password: string;

  @ApiProperty({ description: '이름', example: '박강사' })
  @IsString()
  @IsNotEmpty({ message: '이름을 입력해주세요.' })
  name: string;

  @ApiPropertyOptional({ description: '휴대폰 번호', example: '010-1111-2222' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description:
      '직책 (TEACHER, STAFF만 자가입 가능 — ADMIN/OWNER/SUPER_ADMIN은 자가입으로 절대 될 수 없다. ' +
      '실장 승격이 필요하면 가입 후 원장이 교직원 관리에서 변경한다.)',
    enum: [UserRole.TEACHER, UserRole.STAFF],
    example: UserRole.TEACHER,
  })
  @IsIn([UserRole.TEACHER, UserRole.STAFF], {
    message: '자가입은 TEACHER 또는 STAFF만 선택할 수 있습니다.',
  })
  role: UserRole;
}
