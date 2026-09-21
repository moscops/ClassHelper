import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class AnalyticsStatsQueryDto {
  @ApiPropertyOptional({
    example: '2026-08-10',
    description: '조회 시작 일자 (YYYY-MM-DD). 생략 시 오늘로부터 29일 전.',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-09-08',
    description: '조회 종료 일자 (YYYY-MM-DD). 생략 시 오늘.',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
