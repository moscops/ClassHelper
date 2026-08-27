import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceRosterQueryDto {
  @ApiProperty({
    description: '수업 반 ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  classId: number;

  @ApiPropertyOptional({
    description: '출결 기준 일자 (YYYY-MM-DD, 기본값: 오늘)',
    example: '2026-08-27',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
