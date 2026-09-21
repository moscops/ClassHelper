import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { HomeworkStatus } from '@prisma/client';

export class UpdateHomeworkSubmissionItemDto {
  @ApiProperty({
    example: 1,
    description: '원생 ID',
  })
  @IsInt()
  @IsNotEmpty()
  studentId: number;

  @ApiProperty({
    enum: HomeworkStatus,
    example: HomeworkStatus.COMPLETED,
    description:
      '과제 완성 상태 (COMPLETED, INCOMPLETE, NOT_SUBMITTED, EXCUSED)',
  })
  @IsEnum(HomeworkStatus)
  @IsNotEmpty()
  status: HomeworkStatus;

  @ApiPropertyOptional({
    example: 100,
    description: '과제 채점 점수 (0~100)',
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({
    example: '오답노트까지 꼼꼼하게 정리함',
    description: '개별 맞춤 코멘트 및 피드백',
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}

export class BatchUpdateHomeworkSubmissionsDto {
  @ApiProperty({
    type: [UpdateHomeworkSubmissionItemDto],
    description: '과제 제출 및 평가 업데이트 항목 배열',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateHomeworkSubmissionItemDto)
  submissions: UpdateHomeworkSubmissionItemDto[];
}
