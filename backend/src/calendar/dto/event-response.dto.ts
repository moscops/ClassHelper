import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventCategory, EventColor } from '@prisma/client';

export class EventResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  academyId: number;

  @ApiProperty({ example: '2학기 학부모 설명회' })
  title: string;

  @ApiProperty({ enum: EventCategory, example: EventCategory.ACADEMY })
  category: EventCategory;

  @ApiProperty({ enum: EventColor, example: EventColor.INDIGO })
  color: EventColor;

  @ApiProperty({ example: '2026-09-15' })
  startDate: string;

  @ApiPropertyOptional({ example: '2026-09-16' })
  endDate?: string | null;

  @ApiPropertyOptional({ example: '16:00' })
  startTime?: string | null;

  @ApiPropertyOptional({ example: '18:00' })
  endTime?: string | null;

  @ApiPropertyOptional({ example: '2026학년도 2학기 커리큘럼 및 입시 설명회' })
  description?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
