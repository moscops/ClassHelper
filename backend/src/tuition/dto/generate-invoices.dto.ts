import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
} from 'class-validator';

export class GenerateInvoicesDto {
  @ApiProperty({
    description: '청구 년월 (YYYY-MM)',
    example: '2026-09',
  })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: '청구 년월은 YYYY-MM 형식이어야 합니다.',
  })
  @IsNotEmpty({ message: '청구 년월을 입력해주세요.' })
  billingYearMonth: string;

  @ApiProperty({
    description: '납부 마감일 (YYYY-MM-DD)',
    example: '2026-09-10',
  })
  @IsDateString(
    {},
    { message: '납부 마감일은 유효한 날짜(YYYY-MM-DD)여야 합니다.' },
  )
  @IsNotEmpty({ message: '납부 마감일을 입력해주세요.' })
  dueDate: string;

  @ApiPropertyOptional({
    description:
      '특정 반만 대상으로 청구서를 생성할 경우 반 ID (생략 시 학원 전체 반 대상)',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: '반 ID는 정수여야 합니다.' })
  classId?: number;
}
