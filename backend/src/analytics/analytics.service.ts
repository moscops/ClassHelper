import { Injectable } from '@nestjs/common';
import { UserRole, VisitorType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DailyAnalyticsStatsDto } from './dto/daily-analytics-stats.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 비로그인 방문자 기록 (공개 beacon 엔드포인트에서 호출).
   */
  async trackAnonymousVisit(visitorId: string): Promise<void> {
    await this.recordVisit({
      type: VisitorType.ANONYMOUS,
      dedupKey: `anon:${visitorId}`,
    });
  }

  /**
   * 로그인 사용자 방문 기록 (AuthService.login()에서 호출).
   */
  async recordStaffVisit(
    userId: number,
    academyId: number | null,
  ): Promise<void> {
    await this.recordVisit({
      type: VisitorType.STAFF,
      dedupKey: `user:${userId}`,
      userId,
      academyId: academyId ?? undefined,
    });
  }

  /**
   * 방문 1건을 오늘 날짜로 기록한다. 같은 날 같은 dedupKey는 upsert의 update:{}로
   * no-op 처리되어 중복 집계되지 않는다.
   */
  private async recordVisit(input: {
    type: VisitorType;
    dedupKey: string;
    userId?: number;
    academyId?: number;
  }): Promise<void> {
    const visitDate = truncateToDate(new Date());
    await this.prisma.siteVisit.upsert({
      where: { visitDate_dedupKey: { visitDate, dedupKey: input.dedupKey } },
      create: {
        visitDate,
        type: input.type,
        dedupKey: input.dedupKey,
        userId: input.userId,
        academyId: input.academyId,
      },
      update: {},
    });
  }

  /**
   * 날짜 범위별 방문/로그인/가입/학원개설 통계. 범위 내 모든 날짜를 빠짐없이
   * 0으로 채워 반환한다(프론트 차트가 연속된 날짜 축을 그릴 수 있도록).
   */
  async getStats(
    startDate?: string,
    endDate?: string,
  ): Promise<DailyAnalyticsStatsDto[]> {
    const end = endDate
      ? truncateToDate(new Date(endDate))
      : truncateToDate(new Date());
    const start = startDate
      ? truncateToDate(new Date(startDate))
      : addDays(end, -29);

    const [visits, users, academies] = await Promise.all([
      this.prisma.siteVisit.groupBy({
        by: ['visitDate', 'type'],
        where: { visitDate: { gte: start, lte: end } },
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: {
          createdAt: { gte: start, lte: endOfDay(end) },
          role: { not: UserRole.SUPER_ADMIN },
        },
        select: { createdAt: true },
      }),
      this.prisma.academy.findMany({
        where: { createdAt: { gte: start, lte: endOfDay(end) } },
        select: { createdAt: true },
      }),
    ]);

    const buckets = new Map<string, DailyAnalyticsStatsDto>();
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const key = toDateKey(d);
      buckets.set(key, {
        date: key,
        anonymousVisitors: 0,
        loginCount: 0,
        newSignups: 0,
        newAcademies: 0,
      });
    }

    for (const v of visits) {
      const bucket = buckets.get(toDateKey(v.visitDate));
      if (!bucket) continue;
      if (v.type === VisitorType.ANONYMOUS) bucket.anonymousVisitors = v._count._all;
      else bucket.loginCount = v._count._all;
    }
    for (const u of users) {
      const bucket = buckets.get(toDateKey(u.createdAt));
      if (bucket) bucket.newSignups += 1;
    }
    for (const a of academies) {
      const bucket = buckets.get(toDateKey(a.createdAt));
      if (bucket) bucket.newAcademies += 1;
    }

    return Array.from(buckets.values());
  }
}

// 이 파일의 모든 날짜 연산은 의도적으로 UTC로 통일한다. `new Date('YYYY-MM-DD')`는
// UTC 자정으로 파싱되는데, 여기에 로컬 타임존 기준 setHours(0,0,0,0)을 섞으면 서버
// 로컬 타임존에 따라 날짜가 하루 밀리는 버그가 생긴다(예: UTC-N 지역에서 실행 시).
// visitDate(@db.Date)도 타임존 없는 순수 달력 날짜이므로 UTC 고정이 맞다.
function truncateToDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function endOfDay(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
