import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateReportDto {
  @ApiProperty({
    description: '리포트 시작일 (YYYY-MM-DD)',
    example: '2026-09-01',
  })
  @IsNotEmpty({ message: '시작일을 입력해주세요.' })
  @IsDateString({}, { message: '시작일은 유효한 날짜(YYYY-MM-DD)여야 합니다.' })
  periodStart: string;

  @ApiProperty({
    description: '리포트 종료일 (YYYY-MM-DD)',
    example: '2026-09-30',
  })
  @IsNotEmpty({ message: '종료일을 입력해주세요.' })
  @IsDateString({}, { message: '종료일은 유효한 날짜(YYYY-MM-DD)여야 합니다.' })
  periodEnd: string;

  @ApiPropertyOptional({
    description: '사용자가 직접 수정한 카카오 알림톡 메시지 본문 (선택)',
    example: '[김민준 학생 리포트]\n📅 기간: 2026-09-01 ~ 2026-09-30\n...\n이번 달에도 성실히 학습하였습니다.',
  })
  @IsOptional()
  @IsString({ message: '수정 메시지는 문자열이어야 합니다.' })
  customMessage?: string;
}
