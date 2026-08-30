import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class QueryAttendanceDto {
  @ApiPropertyOptional({
    description: '수업 반 ID 필터',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classId?: number;

  @ApiPropertyOptional({
    description: '수강생 ID 필터',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @ApiPropertyOptional({
    description: '수강생 이름 검색어',
    example: '김민준',
  })
  @IsOptional()
  @IsString()
  studentName?: string;

  @ApiPropertyOptional({
    description: '출결 상태 필터 (PRESENT, ABSENT, LATE, EARLY_LEAVE)',
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({
    description: '조회 시작일 (YYYY-MM-DD)',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '조회 종료일 (YYYY-MM-DD)',
    example: '2026-08-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description:
      '특정 일자 조회 (YYYY-MM-DD, startDate/endDate 대신 단일일자 지정 시)',
    example: '2026-08-27',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: '보강 필요 대상 여부 필터',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isMakeupNeeded?: boolean;

  @ApiPropertyOptional({
    description: '보강 완료 여부 필터',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isMakeupCompleted?: boolean;

  @ApiPropertyOptional({
    description: '페이지 번호 (기본값: 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: '페이지 당 조회 개수 (기본값: 20)',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;
}
