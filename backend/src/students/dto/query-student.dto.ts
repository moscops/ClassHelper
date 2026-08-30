import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryStudentDto {
  @ApiPropertyOptional({
    description: '검색어 (학생 이름, 학생 연락처, 학부모 연락처)',
    example: '홍길동',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: '재원 상태 필터 (ACTIVE, ON_LEAVE, DISCHARGED)',
    enum: StudentStatus,
    example: StudentStatus.ACTIVE,
  })
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;

  @ApiPropertyOptional({
    description: '학년 필터 (예: 초6, 중2, 고1)',
    example: '중2',
  })
  @IsString()
  @IsOptional()
  grade?: string;

  @ApiPropertyOptional({ description: '수업 반 ID 필터', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  classId?: number;

  @ApiPropertyOptional({
    description: '페이지 번호 (기본값: 1)',
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({
    description: '페이지 당 조회 개수 (기본값: 20, 최대: 1000)',
    default: 20,
    example: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit: number = 20;
}
