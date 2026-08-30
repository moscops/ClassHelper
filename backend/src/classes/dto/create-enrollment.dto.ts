import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { EnrollmentStatus } from '@prisma/client';

export class CreateEnrollmentDto {
  @ApiProperty({
    description: '수강 등록할 원생 Student ID',
    example: 1,
  })
  @IsNotEmpty({ message: '원생 ID를 입력해주세요.' })
  @IsInt({ message: '원생 ID는 정수여야 합니다.' })
  studentId: number;

  @ApiPropertyOptional({
    description: '수강 시작일 (기본값: 오늘 날짜)',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.' })
  startDate?: string;

  @ApiPropertyOptional({
    description: '수강 종료 예정일 (선택)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.' })
  endDate?: string;

  @ApiPropertyOptional({
    description: '수강 상태 (기본값: ENROLLED)',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ENROLLED,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
