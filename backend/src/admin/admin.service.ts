import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcademyStatus,
  UserRole,
  PlanTier,
  SubscriptionStatus,
} from '@prisma/client';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 플랫폼 전체 요약 통계 조회
   */
  async getPlatformStats() {
    const [
      totalAcademies,
      activeAcademies,
      suspendedAcademies,
      totalStudents,
      activeStudents,
      totalClasses,
      totalUsers,
    ] = await Promise.all([
      this.prisma.academy.count(),
      this.prisma.academy.count({ where: { status: AcademyStatus.ACTIVE } }),
      this.prisma.academy.count({ where: { status: AcademyStatus.SUSPENDED } }),
      this.prisma.student.count(),
      this.prisma.student.count({ where: { status: 'ACTIVE' } }),
      this.prisma.class.count(),
      this.prisma.user.count({
        where: { role: { not: UserRole.SUPER_ADMIN } },
      }),
    ]);

    // 오늘 날짜의 출결 건수 집계
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendances = await this.prisma.attendance.count({
      where: {
        date: {
          gte: today,
        },
      },
    });

    return {
      academies: {
        total: totalAcademies,
        active: activeAcademies,
        suspended: suspendedAcademies,
        pending: totalAcademies - (activeAcademies + suspendedAcademies),
      },
      students: {
        total: totalStudents,
        active: activeStudents,
      },
      classes: {
        total: totalClasses,
      },
      users: {
        total: totalUsers,
      },
      todayAttendances,
      estimatedAlimtalkCount: todayAttendances * 2, // 등원/하원 알림톡 추정치
    };
  }

  /**
   * 전체 학원 목록 조회 (원장님 정보, 원생 수, 반 수 포함)
   */
  async getAcademies(search?: string, status?: AcademyStatus) {
    const whereCondition: any = {};

    if (status) {
      whereCondition.status = status;
    }

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const academies = await this.prisma.academy.findMany({
      where: whereCondition,
      include: {
        users: {
          where: { role: UserRole.OWNER },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
          take: 1,
        },
        _count: {
          select: {
            students: true,
            classes: true,
            users: true,
          },
        },
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return academies.map((academy) => ({
      id: academy.id,
      name: academy.name,
      status: academy.status,
      businessNumber: academy.businessNumber,
      phoneNumber: academy.phoneNumber,
      address: academy.address,
      createdAt: academy.createdAt,
      updatedAt: academy.updatedAt,
      owner: academy.users[0] || null,
      stats: {
        studentCount: academy._count.students,
        classCount: academy._count.classes,
        staffCount: academy._count.users,
      },
      subscription: this.toSubscriptionSummary(academy.subscription),
    }));
  }

  /**
   * 학원 상세 정보 조회
   */
  async getAcademyDetail(academyId: number) {
    const academy = await this.prisma.academy.findUnique({
      where: { id: academyId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            students: true,
            classes: true,
            attendances: true,
            tuitionInvoices: true,
          },
        },
        subscription: true,
      },
    });

    if (!academy) {
      throw new NotFoundException(
        `ID가 ${academyId}인 학원을 찾을 수 없습니다.`,
      );
    }

    return {
      ...academy,
      subscription: this.toSubscriptionSummary(academy.subscription),
    };
  }

  /**
   * 학원 운영 상태 변경 (정상 / 일시정지 / 대기) 및 감사 로그 기록
   */
  async updateAcademyStatus(
    adminId: number,
    academyId: number,
    status: AcademyStatus,
    reason?: string,
    ipAddress?: string,
  ) {
    const academy = await this.prisma.academy.findUnique({
      where: { id: academyId },
    });

    if (!academy) {
      throw new NotFoundException(
        `ID가 ${academyId}인 학원을 찾을 수 없습니다.`,
      );
    }

    const prevStatus = academy.status;

    // 학원 상태 업데이트 및 감사 로그 트랜잭션 처리
    const [updatedAcademy] = await this.prisma.$transaction([
      this.prisma.academy.update({
        where: { id: academyId },
        data: { status },
      }),
      this.prisma.auditLog.create({
        data: {
          adminId,
          action: 'UPDATE_ACADEMY_STATUS',
          targetType: 'ACADEMY',
          targetId: String(academyId),
          details: {
            academyName: academy.name,
            prevStatus,
            newStatus: status,
            reason: reason || '관리자 수동 변경',
          },
          ipAddress: ipAddress || '127.0.0.1',
        },
      }),
    ]);

    this.logger.log(
      `관리자(ID: ${adminId})가 학원 [${academy.name}] 상태를 [${prevStatus}] -> [${status}]로 변경했습니다. (사유: ${reason || '없음'})`,
    );

    return updatedAcademy;
  }

  /**
   * 학원 요금제 등급 변경 및 감사 로그 기록
   *
   * 기존 구독 레코드가 없는 학원(이 기능 도입 이전 가입)도 있을 수 있으므로
   * update가 아닌 upsert를 사용한다 — 없으면 새로 만들고 있으면 갱신한다.
   */
  async updateSubscription(
    adminId: number,
    academyId: number,
    dto: UpdateSubscriptionDto,
    ipAddress?: string,
  ) {
    const academy = await this.prisma.academy.findUnique({
      where: { id: academyId },
      include: { subscription: true },
    });

    if (!academy) {
      throw new NotFoundException(
        `ID가 ${academyId}인 학원을 찾을 수 없습니다.`,
      );
    }

    const prevTier = academy.subscription?.tier ?? PlanTier.FREE;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;

    const [updatedSubscription] = await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { academyId },
        create: {
          academyId,
          tier: dto.tier,
          status: dto.status ?? SubscriptionStatus.ACTIVE,
          expiresAt,
          notes: dto.notes,
        },
        update: {
          tier: dto.tier,
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.expiresAt !== undefined && { expiresAt }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          adminId,
          action: 'UPDATE_SUBSCRIPTION_TIER',
          targetType: 'ACADEMY',
          targetId: String(academyId),
          details: {
            academyName: academy.name,
            prevTier,
            newTier: dto.tier,
            reason: dto.reason || '관리자 수동 변경',
          },
          ipAddress: ipAddress || '127.0.0.1',
        },
      }),
    ]);

    this.logger.log(
      `관리자(ID: ${adminId})가 학원 [${academy.name}] 요금제를 [${prevTier}] -> [${dto.tier}]로 변경했습니다. (사유: ${dto.reason || '없음'})`,
    );

    return this.toSubscriptionSummary(updatedSubscription);
  }

  /**
   * 최근 관리자 작업 감사 로그 조회
   */
  async getAuditLogs(limit: number = 30) {
    const logs = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id.toString(),
      adminId: log.adminId,
      adminName: log.admin.name,
      adminEmail: log.admin.email,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
    }));
  }

  /**
   * 구독 레코드가 없는(백필 전) 학원은 화면상 FREE/ACTIVE로 취급한다.
   */
  private toSubscriptionSummary(
    subscription?: {
      tier: PlanTier;
      status: SubscriptionStatus;
      expiresAt: Date | null;
      notes?: string | null;
    } | null,
  ) {
    if (!subscription) {
      return {
        tier: PlanTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: null,
        notes: null,
      };
    }
    return {
      tier: subscription.tier,
      status: subscription.status,
      expiresAt: subscription.expiresAt,
      notes: subscription.notes ?? null,
    };
  }
}
