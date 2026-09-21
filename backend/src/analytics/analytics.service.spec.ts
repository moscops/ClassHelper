import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, VisitorType } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      siteVisit: {
        upsert: jest.fn(),
        groupBy: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      academy: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackAnonymousVisit', () => {
    it('dedupKey를 anon: 접두사로 만들어 upsert한다', async () => {
      prisma.siteVisit.upsert.mockResolvedValue({});

      await service.trackAnonymousVisit('a1b2c3d4-e5f6-4789-a012-3456789abcde');

      expect(prisma.siteVisit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            visitDate_dedupKey: expect.objectContaining({
              dedupKey: 'anon:a1b2c3d4-e5f6-4789-a012-3456789abcde',
            }),
          },
          create: expect.objectContaining({
            type: VisitorType.ANONYMOUS,
            dedupKey: 'anon:a1b2c3d4-e5f6-4789-a012-3456789abcde',
          }),
          update: {},
        }),
      );
    });
  });

  describe('recordStaffVisit', () => {
    it('dedupKey를 user: 접두사로 만들어 userId/academyId와 함께 upsert한다', async () => {
      prisma.siteVisit.upsert.mockResolvedValue({});

      await service.recordStaffVisit(7, 10);

      expect(prisma.siteVisit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            visitDate_dedupKey: expect.objectContaining({ dedupKey: 'user:7' }),
          },
          create: expect.objectContaining({
            type: VisitorType.STAFF,
            dedupKey: 'user:7',
            userId: 7,
            academyId: 10,
          }),
          update: {},
        }),
      );
    });

    it('academyId가 null이면 academyId 없이 기록한다', async () => {
      prisma.siteVisit.upsert.mockResolvedValue({});

      await service.recordStaffVisit(7, null);

      expect(prisma.siteVisit.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ userId: 7, academyId: undefined }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('날짜 범위 내 방문/로그인/가입/학원개설을 날짜별로 병합하고 빈 날짜는 0으로 채운다', async () => {
      prisma.siteVisit.groupBy.mockResolvedValue([
        {
          visitDate: new Date('2026-09-07T00:00:00.000Z'),
          type: VisitorType.ANONYMOUS,
          _count: { _all: 5 },
        },
        {
          visitDate: new Date('2026-09-08T00:00:00.000Z'),
          type: VisitorType.STAFF,
          _count: { _all: 2 },
        },
      ]);
      prisma.user.findMany.mockResolvedValue([
        { createdAt: new Date('2026-09-08T03:00:00.000Z') },
      ]);
      prisma.academy.findMany.mockResolvedValue([
        { createdAt: new Date('2026-09-07T10:00:00.000Z') },
      ]);

      const result = await service.getStats('2026-09-06', '2026-09-08');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: '2026-09-06',
        anonymousVisitors: 0,
        loginCount: 0,
        newSignups: 0,
        newAcademies: 0,
      });
      expect(result[1]).toEqual({
        date: '2026-09-07',
        anonymousVisitors: 5,
        loginCount: 0,
        newSignups: 0,
        newAcademies: 1,
      });
      expect(result[2]).toEqual({
        date: '2026-09-08',
        anonymousVisitors: 0,
        loginCount: 2,
        newSignups: 1,
        newAcademies: 0,
      });
    });

    it('startDate/endDate 생략 시 오늘 기준 최근 30일을 조회한다', async () => {
      prisma.siteVisit.groupBy.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.academy.findMany.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result).toHaveLength(30);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { not: UserRole.SUPER_ADMIN },
          }),
        }),
      );
    });
  });
});
