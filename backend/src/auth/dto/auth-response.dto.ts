import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  UserRole,
  UserStatus,
  PlanTier,
  SubscriptionStatus,
} from '@prisma/client';

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

  @ApiProperty({
    description:
      '원장/관리자가 대신 발급한 임시 비밀번호를 아직 변경하지 않은 계정이면 true. ' +
      'true인 동안 프론트는 비밀번호 변경 화면으로 유도해야 한다.',
    example: false,
  })
  mustChangePassword: boolean;

  @ApiProperty({ example: '2026-08-18T00:00:00.000Z' })
  createdAt: Date;
}

export class StaffRegisteredResponseDto extends UserProfileDto {
  @ApiPropertyOptional({
    description:
      '서버가 자동 생성한 임시 비밀번호. 이 응답에서만 평문으로 1회 반환되며 다시 조회할 수 없다 — ' +
      '원장이 직접 비밀번호를 지정한 경우에는 포함되지 않는다.',
    example: 'Xk7#mQ2p9!',
  })
  tempPassword?: string;
}

export class StaffMemberResponseDto extends UserProfileDto {
  @ApiProperty({
    description:
      '재직 상태. INACTIVE는 퇴사 처리된(소프트 삭제) 계정으로 로그인이 차단된다.',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiProperty({ description: '담당 중인 수업 수', example: 2 })
  taughtClassesCount: number;

  @ApiProperty({ description: '작성한 수업일지 수', example: 15 })
  classLogsCount: number;

  @ApiProperty({ description: '처리한 수납 건수', example: 8 })
  processedPaymentsCount: number;
}

export class StaffDeactivatedResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: '퇴사 처리되었습니다.' })
  message: string;
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

export class ChangePasswordResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: '비밀번호가 성공적으로 변경되었습니다.' })
  message: string;
}
