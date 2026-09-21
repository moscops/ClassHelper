import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PlanTier, SubscriptionStatus } from '@prisma/client';

export class UpdateSubscriptionDto {
  @ApiProperty({
    enum: PlanTier,
    description: '변경할 요금제 등급',
    example: PlanTier.PRO,
  })
  @IsNotEmpty({ message: '요금제 등급을 지정해주세요.' })
  @IsEnum(PlanTier, {
    message: '유효한 요금제 등급(FREE, PRO, ENTERPRISE)을 입력해주세요.',
  })
  tier: PlanTier;

  @ApiPropertyOptional({
    enum: SubscriptionStatus,
    description: '구독 상태 (생략 시 ACTIVE 유지)',
    example: SubscriptionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus, {
    message: '유효한 구독 상태(ACTIVE, CANCELED)를 입력해주세요.',
  })
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    description: '구독 만료일 (YYYY-MM-DD, 생략 시 무기한)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: '만료일은 유효한 날짜(YYYY-MM-DD)여야 합니다.' })
  expiresAt?: string;

  @ApiPropertyOptional({
    description: '관리자 메모 (예: 프로모션 사유)',
    example: '6개월 프로모션 무료 제공',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: '변경 사유 (감사 로그 기록용)',
    example: '유료 전환 문의 후 수동 업그레이드',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
