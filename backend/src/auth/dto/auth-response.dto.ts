import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, PlanTier, SubscriptionStatus } from '@prisma/client';

export class SubscriptionSummaryDto {
  @ApiProperty({ enum: PlanTier, example: PlanTier.FREE })
  tier: PlanTier;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @ApiPropertyOptional({ example: null })
  expiresAt?: Date | null;
}

export class UserProfileDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: 1 })
  academyId?: number | null;

  @ApiProperty({ example: 'owner@classhelper.kr' })
  email: string;

  @ApiProperty({ example: '김원장' })
  name: string;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  phone?: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.OWNER })
  role: UserRole;

  @ApiProperty({ example: '2026-08-18T00:00:00.000Z' })
  createdAt: Date;
}

export class AcademySummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '클래스헬퍼 어학원' })
  name: string;

  @ApiPropertyOptional({ example: '123-45-67890' })
  businessNumber?: string | null;

  @ApiPropertyOptional({ example: '02-1234-5678' })
  phoneNumber?: string | null;

  @ApiPropertyOptional({ example: '서울시 강남구 테헤란로 123' })
  address?: string | null;

  @ApiPropertyOptional({ type: SubscriptionSummaryDto })
  subscription?: SubscriptionSummaryDto | null;
}

export class TokensResponseDto {
  @ApiProperty({
    description: 'API 요청용 단기 JWT Access Token (수명: 15분)',
    example: 'eyJhbGciOiJIUzI1NiIsIn...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Access Token 재발급용 장기 Refresh Token (수명: 7일)',
    example: 'eyJhbGciOiJIUzI1NiIsIn...',
  })
  refreshToken: string;
}

export class AuthResponseDto extends TokensResponseDto {
  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;

  @ApiPropertyOptional({ type: AcademySummaryDto })
  academy?: AcademySummaryDto | null;
}

export class UserDetailResponseDto extends UserProfileDto {
  @ApiPropertyOptional({ type: AcademySummaryDto })
  academy?: AcademySummaryDto | null;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: '성공적으로 로그아웃되었습니다.' })
  message: string;
}
