import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuickCheckType {
  CHECK_IN = 'CHECK_IN', // 등원
  CHECK_OUT = 'CHECK_OUT', // 하원
}

export class QuickCheckDto {
  @ApiProperty({
    description: '수강생 ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  studentId: number;

  @ApiProperty({
    description: '수업 반 ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  classId: number;

  @ApiProperty({
    description: '등/하원 유형 (CHECK_IN: 등원, CHECK_OUT: 하원)',
    enum: QuickCheckType,
    example: QuickCheckType.CHECK_IN,
  })
  @IsEnum(QuickCheckType)
  @IsNotEmpty()
  type: QuickCheckType;

  @ApiPropertyOptional({
    description: '출결 기준 일자 (기본값: 오늘 YYYY-MM-DD)',
    example: '2026-08-27',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: '기록 시각 (기본값: 현재 시각 ISO 문자열)',
    example: '2026-08-27T17:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  time?: string;
}
