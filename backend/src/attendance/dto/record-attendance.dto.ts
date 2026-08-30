import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class RecordAttendanceDto {
  @ApiProperty({
    description: '수강생 ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  studentId: number;

  @ApiProperty({
    description: '수업 반 ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  classId: number;

  @ApiProperty({
    description: '출결 일자 (YYYY-MM-DD)',
    example: '2026-08-27',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description:
      '출결 상태 (PRESENT: 출석, ABSENT: 결석, LATE: 지각, EARLY_LEAVE: 조퇴)',
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
  })
  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: AttendanceStatus;

  @ApiPropertyOptional({
    description: '등원 시각 (ISO 8601 문자열)',
    example: '2026-08-27T17:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  checkInTime?: string;

  @ApiPropertyOptional({
    description: '하원 시각 (ISO 8601 문자열)',
    example: '2026-08-27T19:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  checkOutTime?: string;

  @ApiPropertyOptional({
    description: '지각/결석/조퇴 사유',
    example: '병원 진료로 인한 지각',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiPropertyOptional({
    description: '보강 수업 필요 여부',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isMakeupNeeded?: boolean;

  @ApiPropertyOptional({
    description: '보강 수업 완료 여부',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isMakeupCompleted?: boolean;

  @ApiPropertyOptional({
    description: '출결 특이사항 메모',
    example: '오늘 숙제 덜 끝내서 10분 늦게 하원함',
  })
  @IsOptional()
  @IsString()
  memo?: string;
}
