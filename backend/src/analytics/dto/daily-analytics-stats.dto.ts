import { ApiProperty } from '@nestjs/swagger';

export class DailyAnalyticsStatsDto {
  @ApiProperty({ example: '2026-09-08', description: '날짜 (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: 42, description: '비로그인 고유 방문자 수' })
  anonymousVisitors: number;

  @ApiProperty({ example: 15, description: '그날 로그인한 고유 사용자 수' })
  loginCount: number;

  @ApiProperty({
    example: 3,
    description: '신규 가입자 수 (원장/실장/강사/조교 통합, SUPER_ADMIN 제외)',
  })
  newSignups: number;

  @ApiProperty({ example: 1, description: '신규 개설 학원 수' })
  newAcademies: number;
}
