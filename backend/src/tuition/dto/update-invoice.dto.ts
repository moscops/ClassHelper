import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    description: '할인 금액 (형제 할인, 장학 할인, 이벤트 할인 등)',
    example: 30000,
  })
  @IsOptional()
  @IsNumber({}, { message: '할인 금액은 숫자여야 합니다.' })
  @Min(0, { message: '할인 금액은 0원 이상이어야 합니다.' })
  discountAmount?: number;

  @ApiPropertyOptional({
    description: '납부 마감일 (YYYY-MM-DD)',
    example: '2026-09-15',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: '납부 마감일은 유효한 날짜(YYYY-MM-DD)여야 합니다.' },
  )
  dueDate?: string;

  @ApiPropertyOptional({
    description: '청구 항목 상세',
    example: '9월 정규반 수강료 + 형제 할인 적용',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
