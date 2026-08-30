import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, StudentStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({ description: '원생 이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty({ message: '원생 이름을 입력해주세요.' })
  name: string;

  @ApiPropertyOptional({
    description: '성별',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsEnum(Gender, { message: '유효한 성별(MALE, FEMALE)을 선택해주세요.' })
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({
    description: '생년월일 (YYYY-MM-DD)',
    example: '2012-05-15',
  })
  @IsDateString({}, { message: '올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.' })
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ description: '학교명', example: '서울초등학교' })
  @IsString()
  @IsOptional()
  schoolName?: string;

  @ApiPropertyOptional({ description: '학년', example: '초6' })
  @IsString()
  @IsOptional()
  grade?: string;

  @ApiPropertyOptional({
    description: '학생 본인 연락처',
    example: '010-1111-2222',
  })
  @IsString()
  @IsOptional()
  studentPhone?: string;

  @ApiProperty({
    description: '학부모 연락처 (알림/청구용 필수)',
    example: '010-3333-4444',
  })
  @IsString()
  @IsNotEmpty({ message: '학부모 연락처는 필수입니다.' })
  parentPhone: string;

  @ApiPropertyOptional({ description: '학부모 성함', example: '홍판서' })
  @IsString()
  @IsOptional()
  parentName?: string;

  @ApiPropertyOptional({
    description: '학부모 관계 (예: 모, 부, 조모)',
    example: '모',
  })
  @IsString()
  @IsOptional()
  parentRelationship?: string;

  @ApiPropertyOptional({
    description: '재원 상태',
    enum: StudentStatus,
    default: StudentStatus.ACTIVE,
    example: StudentStatus.ACTIVE,
  })
  @IsEnum(StudentStatus, {
    message: '유효한 상태(ACTIVE, ON_LEAVE, DISCHARGED)를 선택해주세요.',
  })
  @IsOptional()
  status?: StudentStatus;

  @ApiPropertyOptional({
    description: '입원일 (YYYY-MM-DD)',
    example: '2026-08-18',
  })
  @IsDateString({}, { message: '올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.' })
  @IsOptional()
  enrolledAt?: string;

  @ApiPropertyOptional({
    description: '특이사항 및 메모',
    example: '수학 심화반 희망, 알레르기 주의',
  })
  @IsString()
  @IsOptional()
  memo?: string;
}
