import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
} from 'class-validator';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';

export class CreateNotificationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  studentId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  classId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiProperty({
    enum: NotificationType,
    default: NotificationType.UNATTENDED_ALERT,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    default: NotificationChannel.KAKAO,
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel = NotificationChannel.KAKAO;

  @ApiPropertyOptional({
    enum: NotificationStatus,
    default: NotificationStatus.SENT,
  })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus = NotificationStatus.SENT;

  @ApiProperty({ example: '미등원 알림: 김민준 학생' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      '[ClassHelper 안심 알림] 김민준 학생이 [중등 수학 심화반] 수업 시각까지 미등원 상태입니다.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  @IsOptional()
  @IsString()
  targetPhone?: string;

  @ApiPropertyOptional({ example: { scheduleTime: '17:00' } })
  @IsOptional()
  metadata?: any;
}
