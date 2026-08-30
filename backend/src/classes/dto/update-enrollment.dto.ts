import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { EnrollmentStatus } from '@prisma/client';

export class UpdateEnrollmentDto {
  @ApiPropertyOptional({
    description:
      '수강 상태 (ENROLLED: 수강중, COMPLETED: 종강, DROPPED: 중도하차/퇴반, PAUSED: 일시정지)',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({
    description: '수강 종료일 (퇴반/종강일)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString({}, { message: '올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.' })
  endDate?: string;
}
