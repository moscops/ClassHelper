import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class QueryInvoicesDto {
  @ApiPropertyOptional({
    description: '청구 년월 필터 (YYYY-MM)',
    example: '2026-09',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: '청구 년월은 YYYY-MM 형식이어야 합니다.',
  })
  billingYearMonth?: string;

  @ApiPropertyOptional({
    enum: InvoiceStatus,
    description: '청구 상태 필터',
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: '특정 원생 ID 필터',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @ApiPropertyOptional({
    description: '원생 이름 검색 키워드',
    example: '김민준',
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
