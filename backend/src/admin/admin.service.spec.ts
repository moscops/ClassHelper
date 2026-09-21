import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PlanTier, SubscriptionStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  const mockAcademy = {
    id: 1,
    name: '클래스헬퍼 어학원',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      academy: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      subscription: {
        upsert: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<any>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('updateSubscription', () => {
    it('학원을 찾을 수 없으면 NotFoundException 발생', async () => {
      prisma.academy.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSubscription(1, 999, { tier: PlanTier.PRO }),
      ).rejects.toThrow(NotFoundException);
    });

    it('기존 구독 레코드가 없어도(백필 전 학원) upsert로 새로 생성', async () => {
      prisma.academy.findUnique.mockResolvedValue({
        ...mockAcademy,
        subscription: null,
      });
      prisma.subscription.upsert.mockResolvedValue({
        academyId: 1,
        tier: PlanTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: null,
        notes: null,
      });

      const result = await service.updateSubscription(5, 1, {
        tier: PlanTier.PRO,
      });

      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { academyId: 1 },
          create: expect.objectContaining({ academyId: 1, tier: PlanTier.PRO }),
        }),
      );
      expect(result.tier).toBe(PlanTier.PRO);
    });

    it('등급 변경 시 감사 로그에 이전/신규 등급을 기록', async () => {
      prisma.academy.findUnique.mockResolvedValue({
        ...mockAcademy,
        subscription: {
          tier: PlanTier.FREE,
          status: SubscriptionStatus.ACTIVE,
        },
      });
      prisma.subscription.upsert.mockResolvedValue({
        academyId: 1,
        tier: PlanTier.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: null,
        notes: null,
      });

      await service.updateSubscription(
        5,
        1,
        { tier: PlanTier.ENTERPRISE, reason: '테스트 업그레이드' },
        '127.0.0.1',
      );

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'UPDATE_SUBSCRIPTION_TIER',
            targetType: 'ACADEMY',
            targetId: '1',
            details: expect.objectContaining({
              prevTier: PlanTier.FREE,
              newTier: PlanTier.ENTERPRISE,
              reason: '테스트 업그레이드',
            }),
          }),
        }),
      );
    });
  });

  describe('getAcademyDetail', () => {
    it('구독 레코드가 없는 학원은 FREE/ACTIVE로 응답', async () => {
      prisma.academy.findUnique.mockResolvedValue({
        ...mockAcademy,
        users: [],
        _count: { students: 0, classes: 0, attendances: 0, tuitionInvoices: 0 },
        subscription: null,
      });

      const result = await service.getAcademyDetail(1);

      expect(result.subscription).toEqual({
        tier: PlanTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: null,
        notes: null,
      });
    });
  });
});
