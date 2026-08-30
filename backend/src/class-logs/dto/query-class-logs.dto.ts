import { IsOptional, IsInt, IsString, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryClassLogsDto {
  @ApiPropertyOptional({
    example: 1,
    description: '특정 반 ID 필터',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classId?: number;

  @ApiPropertyOptional({
    example: 2,
    description: '작성 강사 ID 필터',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacherId?: number;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: '조회 시작 일자 (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description: '조회 종료 일자 (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: '다항식',
    description: '진도/수업내용/과제 검색 키워드',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: '페이지 번호 (1부터 시작)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: '한 페이지당 항목 수',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
