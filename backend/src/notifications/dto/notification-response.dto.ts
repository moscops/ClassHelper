import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';

export class NotificationStudentSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '김민준' })
  name: string;

  @ApiPropertyOptional({ example: '중2' })
  grade?: string | null;

  @ApiProperty({ example: '010-1234-5678' })
  parentPhone: string;
}

export class NotificationClassSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '중등 수학 심화반' })
  name: string;

  @ApiPropertyOptional({ example: '수학' })
  subject?: string | null;

  @ApiPropertyOptional({ example: '월/수/금 17:00-19:00' })
  schedule?: string | null;
}

export class NotificationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  academyId: number;

  @ApiPropertyOptional({ example: 10 })
  userId?: number | null;

  @ApiPropertyOptional({ example: 100 })
  studentId?: number | null;

  @ApiPropertyOptional({ example: 1 })
  classId?: number | null;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.UNATTENDED_ALERT,
  })
  type: NotificationType;

  @ApiProperty({
    enum: NotificationChannel,
    example: NotificationChannel.KAKAO,
  })
  channel: NotificationChannel;

  @ApiProperty({
    enum: NotificationStatus,
    example: NotificationStatus.SENT,
  })
  status: NotificationStatus;

  @ApiProperty({ example: '미등원 알림: 김민준 학생' })
  title: string;

  @ApiProperty({
    example:
      '[ClassHelper 안심 알림] 김민준 학생이 [중등 수학 심화반] 수업 시작 시각(17:00)까지 미등원 상태입니다.',
  })
  message: string;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  targetPhone?: string | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiPropertyOptional({ example: '2026-08-30T13:30:00.000Z' })
  readAt?: Date | null;

  @ApiPropertyOptional({
    example: { scheduleTime: '17:00', isAutoTriggered: true },
  })
  metadata?: any;

  @ApiProperty({ example: '2026-08-30T13:15:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-30T13:15:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: NotificationStudentSummaryDto })
  student?: NotificationStudentSummaryDto | null;

  @ApiPropertyOptional({ type: NotificationClassSummaryDto })
  class?: NotificationClassSummaryDto | null;
}

export class PaginatedNotificationResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({ description: '전체 안 읽은 알림 수', example: 3 })
  unreadCount: number;

  @ApiProperty({
    description: '안 읽은 미등원/지각 경고 알림 수',
    example: 1,
  })
  unattendedAlertCount: number;

  @ApiProperty({
    description:
      '현재 해결되지 않은 미등원 경고가 존재하는지 여부 (출결 버튼 신호 활성화 플래그)',
    example: true,
  })
  hasUnattendedAlert: boolean;
}
