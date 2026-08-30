import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateStudentStatusDto {
  @ApiProperty({
    description: '변경할 재원 상태 (ACTIVE, ON_LEAVE, DISCHARGED)',
    enum: StudentStatus,
    example: StudentStatus.ON_LEAVE,
  })
  @IsEnum(StudentStatus, {
    message: '유효한 상태(ACTIVE, ON_LEAVE, DISCHARGED)를 선택해주세요.',
  })
  @IsNotEmpty({ message: '상태는 필수 항목입니다.' })
  status: StudentStatus;

  @ApiPropertyOptional({
    description: '퇴원일 (상태가 DISCHARGED일 때 권장)',
    example: '2026-08-31',
  })
  @IsDateString({}, { message: '올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.' })
  @IsOptional()
  dischargedAt?: string;

  @ApiPropertyOptional({
    description: '상태 변경 사유 메모',
    example: '개인 사정으로 1개월 휴원',
  })
  @IsString()
  @IsOptional()
  memo?: string;
}
