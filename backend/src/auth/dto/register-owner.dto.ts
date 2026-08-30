import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterOwnerDto {
  // 학원 정보
  @ApiProperty({ description: '학원 이름', example: '클래스헬퍼 어학원' })
  @IsString()
  @IsNotEmpty({ message: '학원 이름을 입력해주세요.' })
  academyName: string;

  @ApiPropertyOptional({
    description: '사업자등록번호',
    example: '123-45-67890',
  })
  @IsString()
  @IsOptional()
  businessNumber?: string;

  @ApiPropertyOptional({
    description: '학원 대표 전화번호',
    example: '02-1234-5678',
  })
  @IsString()
  @IsOptional()
  academyPhone?: string;

  @ApiPropertyOptional({
    description: '학원 주소',
    example: '서울시 강남구 테헤란로 123',
  })
  @IsString()
  @IsOptional()
  address?: string;

  // 원장님(관리자) 계정 정보
  @ApiProperty({
    description: '원장님 이메일 (로그인 ID)',
    example: 'owner@classhelper.kr',
  })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;

  @ApiProperty({
    description: '비밀번호 (8자 이상, 영문/숫자/특수문자 포함)',
    example: 'Password123!',
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

  @ApiProperty({ description: '원장님 성함', example: '김원장' })
  @IsString()
  @IsNotEmpty({ message: '성함을 입력해주세요.' })
  name: string;

  @ApiPropertyOptional({
    description: '원장님 휴대폰 번호',
    example: '010-1234-5678',
  })
  @IsString()
  @IsOptional()
  phone?: string;
}
