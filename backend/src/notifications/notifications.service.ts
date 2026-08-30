import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. 알림 목록 조회 (페이지네이션 & 다차원 필터링)
   */
  async getNotifications(
    academyId: number,
    queryDto: QueryNotificationDto,
  ): Promise<PaginatedNotificationResponseDto> {
    const { type, channel, isRead, search, page = 1, limit = 20 } = queryDto;

    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      academyId,
    };

    if (type) {
      where.type = type;
    }

    if (channel) {
      where.channel = channel;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        include: {
          student: {
            select: {
              id: true,
              name: true,
              grade: true,
              parentPhone: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              subject: true,
              schedule: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => this.mapToResponseDto(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 2. 안 읽은 알림 수 및 미등원 경고 알림 집계
   */
  async getUnreadCount(academyId: number): Promise<UnreadCountResponseDto> {
    const [unreadCount, unattendedAlertCount] = await Promise.all([
      this.prisma.notification.count({
        where: {
          academyId,
          isRead: false,
        },
      }),
      this.prisma.notification.count({
        where: {
          academyId,
          isRead: false,
          type: NotificationType.UNATTENDED_ALERT,
        },
      }),
    ]);

    return {
      unreadCount,
      unattendedAlertCount,
      hasUnattendedAlert: unattendedAlertCount > 0,
    };
  }

  /**
   * 3. 특정 알림 읽음 처리
   */
  async markAsRead(
    academyId: number,
    notificationId: number,
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, academyId },
    });

    if (!notification) {
      throw new NotFoundException('해당 알림을 찾을 수 없습니다.');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
            parentPhone: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            schedule: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * 4. 전체 알림 일괄 읽음 처리
   */
  async markAllAsRead(
    academyId: number,
  ): Promise<{ success: boolean; count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        academyId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      count: result.count,
    };
  }

  /**
   * 5. 알림 삭제
   */
  async deleteNotification(
    academyId: number,
    notificationId: number,
  ): Promise<{ success: boolean; message: string }> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, academyId },
    });

    if (!notification) {
      throw new NotFoundException('해당 알림을 찾을 수 없습니다.');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return {
      success: true,
      message: '알림이 성공적으로 삭제되었습니다.',
    };
  }

  /**
   * 6. 알림 생성 및 카카오/SMS 발송 트리거
   */
  async createNotification(
    academyId: number,
    dto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    // 카카오 알림톡/SMS 발송 시뮬레이션 로그
    if (
      dto.channel === NotificationChannel.KAKAO ||
      dto.channel === NotificationChannel.SMS
    ) {
      this.logger.log(
        `📱 [${dto.channel} 발송] 대상 번호: ${dto.targetPhone} | 제목: ${dto.title} | 내용: ${dto.message}`,
      );
    }

    const created = await this.prisma.notification.create({
      data: {
        academyId,
        studentId: dto.studentId,
        classId: dto.classId,
        userId: dto.userId,
        type: dto.type,
        channel: dto.channel || NotificationChannel.KAKAO,
        status: dto.status || NotificationStatus.SENT,
        title: dto.title,
        message: dto.message,
        targetPhone: dto.targetPhone,
        metadata: dto.metadata,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
            parentPhone: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            schedule: true,
          },
        },
      },
    });

    return this.mapToResponseDto(created);
  }

  /**
   * 7. 실패한 카카오 알림톡/SMS 재발송 (Retry)
   */
  async retryNotification(
    academyId: number,
    notificationId: number,
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, academyId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
            parentPhone: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            schedule: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('해당 알림을 찾을 수 없습니다.');
    }

    this.logger.log(
      `🔄 [알림 재발송] ID: ${notification.id} | 채널: ${notification.channel} | 번호: ${notification.targetPhone}`,
    );

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.SENT,
        updatedAt: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
            parentPhone: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            schedule: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  private mapToResponseDto(item: any): NotificationResponseDto {
    return {
      id: item.id,
      academyId: item.academyId,
      userId: item.userId,
      studentId: item.studentId,
      classId: item.classId,
      type: item.type,
      channel: item.channel,
      status: item.status,
      title: item.title,
      message: item.message,
      targetPhone: item.targetPhone,
      isRead: item.isRead,
      readAt: item.readAt,
      metadata: item.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      student: item.student,
      class: item.class,
    };
  }
}
