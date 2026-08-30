import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateStudentDto } from './create-student.dto';

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @ApiPropertyOptional({
    description: '퇴원일 (YYYY-MM-DD)',
    example: '2026-12-31',
  })
  @IsDateString({}, { message: '올바른 날짜 형식(YYYY-MM-DD)을 입력해주세요.' })
  @IsOptional()
  dischargedAt?: string;
}
