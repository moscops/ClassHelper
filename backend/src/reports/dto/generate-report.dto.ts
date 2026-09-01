import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

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
}
