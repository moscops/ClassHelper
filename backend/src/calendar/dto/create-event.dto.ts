import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventCategory, EventColor } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    description: '이벤트 제목',
    example: '2학기 학부모 설명회',
    maxLength: 150,
  })
  @IsNotEmpty({ message: '이벤트 제목을 입력해주세요.' })
  @IsString()
  @MaxLength(150, { message: '이벤트 제목은 150자를 초과할 수 없습니다.' })
  title: string;

  @ApiProperty({
    description: '이벤트 카테고리',
    enum: EventCategory,
    example: EventCategory.ACADEMY,
  })
  @IsEnum(EventCategory, { message: '유효하지 않은 이벤트 카테고리입니다.' })
  category: EventCategory;

  @ApiPropertyOptional({
    description: '캘린더 표시 색상',
    enum: EventColor,
    example: EventColor.INDIGO,
  })
  @IsOptional()
  @IsEnum(EventColor, { message: '유효하지 않은 색상입니다.' })
  color?: EventColor;

  @ApiProperty({
    description: '시작 일자 (YYYY-MM-DD)',
    example: '2026-09-15',
  })
  @IsDateString(
    {},
    { message: '시작 일자는 유효한 날짜(YYYY-MM-DD)여야 합니다.' },
  )
  @IsNotEmpty({ message: '시작 일자를 입력해주세요.' })
  startDate: string;

  @ApiPropertyOptional({
    description: '종료 일자 (YYYY-MM-DD, 여러 날에 걸친 이벤트인 경우)',
    example: '2026-09-16',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: '종료 일자는 유효한 날짜(YYYY-MM-DD)여야 합니다.' },
  )
  endDate?: string;

  @ApiPropertyOptional({ description: '시작 시각 (HH:mm)', example: '16:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: '시작 시각은 HH:mm 형식이어야 합니다.',
  })
  startTime?: string;

  @ApiPropertyOptional({ description: '종료 시각 (HH:mm)', example: '18:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: '종료 시각은 HH:mm 형식이어야 합니다.',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: '이벤트 상세 설명',
    example: '2026학년도 2학기 커리큘럼 및 입시 설명회',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
