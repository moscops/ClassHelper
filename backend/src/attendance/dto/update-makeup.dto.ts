import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMakeupDto {
  @ApiProperty({
    description: '보강 수업 필요 여부',
    example: true,
  })
  @IsBoolean()
  @Type(() => Boolean)
  isMakeupNeeded: boolean;

  @ApiPropertyOptional({
    description: '보강 수업 완료 여부',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isMakeupCompleted?: boolean;

  @ApiPropertyOptional({
    description: '보강 관련 메모 또는 사유',
    example: '8월 29일 금요일 18:00 개별 보강 예정',
  })
  @IsOptional()
  @IsString()
  memo?: string;
}
