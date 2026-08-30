import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterStaffDto {
  @ApiProperty({
    description: '강사/직원 이메일 (로그인 ID)',
    example: 'teacher1@classhelper.kr',
  })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;

  @ApiProperty({
    description: '초기 비밀번호 (8자 이상, 영문/숫자/특수문자 포함)',
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

  @ApiProperty({ description: '이름', example: '이강사' })
  @IsString()
  @IsNotEmpty({ message: '이름을 입력해주세요.' })
  name: string;

  @ApiPropertyOptional({ description: '휴대폰 번호', example: '010-9876-5432' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: '직책/권한 (TEACHER, ADMIN, STAFF)',
    enum: UserRole,
    default: UserRole.TEACHER,
    example: UserRole.TEACHER,
  })
  @IsEnum(UserRole, {
    message: '유효한 역할을 선택해주세요 (TEACHER, ADMIN, STAFF).',
  })
  role: UserRole;
}
