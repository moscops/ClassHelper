import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({
    description: '이번 회차 결제 금액',
    example: 350000,
  })
  @IsNumber({}, { message: '결제 금액은 숫자여야 합니다.' })
  @IsPositive({ message: '결제 금액은 0보다 커야 합니다.' })
  amount: number;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: '결제 수단',
    default: PaymentMethod.CARD,
  })
  @IsOptional()
  @IsEnum(PaymentMethod, {
    message:
      '유효한 결제 수단(CARD, CASH, BANK_TRANSFER, EASY_PAY, OTHER)을 입력해주세요.',
  })
  method?: PaymentMethod = PaymentMethod.CARD;

  @ApiPropertyOptional({
    description: '결제 승인 일시 (생략 시 현재 시각)',
    example: '2026-09-05T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '결제 승인 일시는 유효한 일시여야 합니다.' })
  paidAt?: string;

  @ApiPropertyOptional({
    description: '영수증 / 카드 승인 번호',
    example: 'RCP-20260905-0001',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  receiptNumber?: string;

  @ApiPropertyOptional({
    description: '결제 관련 메모',
    example: '1회차 분할 납부',
  })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({
    description: '수납을 처리한 직원 User ID (생략 시 요청자 본인)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  processedById?: number;
}
