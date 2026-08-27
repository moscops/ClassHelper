import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceStatsQueryDto {
  @ApiPropertyOptional({
    description: '수업 반 ID (미지정 시 학원 전체 통계)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classId?: number;

  @ApiPropertyOptional({
    description: '통계 시작 일자 (기본값: 당월 1일 YYYY-MM-DD)',
    example: '2026-08-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '통계 종료 일자 (기본값: 오늘 YYYY-MM-DD)',
    example: '2026-08-27',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
