import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { HomeworkStatus } from '@prisma/client';

export class CreateHomeworkSubmissionDto {
  @ApiProperty({
    example: 1,
    description: '과제 대상 원생 ID',
  })
  @IsInt()
  @IsNotEmpty()
  studentId: number;

  @ApiPropertyOptional({
    enum: HomeworkStatus,
    example: HomeworkStatus.COMPLETED,
    description: '과제 완성 상태 (COMPLETED, INCOMPLETE, NOT_SUBMITTED, EXCUSED)',
    default: HomeworkStatus.NOT_SUBMITTED,
  })
  @IsEnum(HomeworkStatus)
  @IsOptional()
  status?: HomeworkStatus = HomeworkStatus.NOT_SUBMITTED;

  @ApiPropertyOptional({
    example: 95,
    description: '과제 평가 점수 (0~100점)',
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({
    example: '개념 이해도가 높고 서술형 풀이 과정이 매우 우수함',
    description: '원생 개별 맞춤 코멘트 및 피드백',
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}

export class CreateClassLogDto {
  @ApiProperty({
    example: 1,
    description: '수업을 진행한 반 ID',
  })
  @IsInt()
  @IsNotEmpty()
  classId: number;

  @ApiProperty({
    example: '2026-08-30',
    description: '수업 진행 일자 (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    example: '개념원리 수학(상) p.45~62 다항식의 연산',
    description: '교재 및 진도 범위',
  })
  @IsString()
  @IsNotEmpty()
  curriculum: string;

  @ApiPropertyOptional({
    example: '다항식의 곱셈 공식 1~5번 암기 및 예제 1~10번 풀이 진행',
    description: '당일 수업 핵심 내용 요약',
  })
  @IsString()
  @IsOptional()
  lessonContent?: string;

  @ApiPropertyOptional({
    example: '워크북 p.20~24 짝수번 풀기 및 오답노트 작성',
    description: '당일 부여한 과제(숙제) 내용',
  })
  @IsString()
  @IsOptional()
  homework?: string;

  @ApiPropertyOptional({
    example: '전원 집중도 양호. 다음 시간 곱셈공식 쪽지시험 예정',
    description: '수업 중 특이사항 메모',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    type: [CreateHomeworkSubmissionDto],
    description: '수강생별 과제 검사 및 피드백 초기 목록 (생략 시 반 수강생 전체 NOT_SUBMITTED로 자동 생성)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHomeworkSubmissionDto)
  @IsOptional()
  submissions?: CreateHomeworkSubmissionDto[];
}
