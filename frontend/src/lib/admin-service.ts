import { api } from './api';
import { PlanTier, SubscriptionStatus, SubscriptionSummary } from '@/types/auth';

export interface PlatformStats {
  academies: {
    total: number;
    active: number;
    suspended: number;
    pending: number;
  };
  students: {
    total: number;
    active: number;
  };
  classes: {
    total: number;
  };
  users: {
    total: number;
  };
  todayAttendances: number;
  estimatedAlimtalkCount: number;
}

export interface AdminAcademyItem {
  id: number;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  businessNumber?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    createdAt: string;
  } | null;
  stats: {
    studentCount: number;
    classCount: number;
    staffCount: number;
  };
  subscription?: SubscriptionSummary | null;
}

export interface UpdateSubscriptionPayload {
  tier: PlanTier;
  status?: SubscriptionStatus;
  expiresAt?: string;
  notes?: string;
  reason?: string;
}

export interface AdminAuditLogItem {
  id: string;
  adminId: number;
  adminName: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export interface DailyAnalyticsStat {
  date: string; // YYYY-MM-DD
  anonymousVisitors: number; // 비로그인 고유 방문자 수
  loginCount: number; // 로그인 고유 교직원 수
  newSignups: number; // 신규 가입자 수 (원장/실장/강사/조교)
  newAcademies: number; // 신규 개설 학원 수
}

export interface VisitorAnalyticsSummary {
  totalVisitors: number; // anonymousVisitors + loginCount 합계
  totalAnonymous: number;
  totalLogins: number;
  totalNewSignups: number;
  totalNewAcademies: number;
  avgDailyVisitors: number;
  todayVisitors: number;
  todayLogins: number;
  todayNewSignups: number;
  todayNewAcademies: number;
  dailyStats: DailyAnalyticsStat[];
}

export const adminService = {
  /**
   * 플랫폼 전체 요약 통계
   */
  async getPlatformStats(): Promise<PlatformStats> {
    const response = await api.get<PlatformStats>('/admin/stats');
    return response.data;
  },

  /**
   * 익명 방문자 비콘 기록 (POST /analytics/track)
   */
  async trackVisitor(visitorId: string): Promise<void> {
    await api.post('/analytics/track', { visitorId });
  },

  /**
   * 날짜 기준 사이트 방문자 수 및 플랫폼 성장 통계 조회 (GET /analytics/stats)
   */
  async getVisitorAnalytics(
    startDate?: string,
    endDate?: string,
  ): Promise<VisitorAnalyticsSummary> {
    const response = await api.get<DailyAnalyticsStat[]>('/analytics/stats', {
      params: { startDate, endDate },
    });
    const dailyStats = response.data || [];

    let totalAnonymous = 0;
    let totalLogins = 0;
    let totalNewSignups = 0;
    let totalNewAcademies = 0;

    for (const stat of dailyStats) {
      totalAnonymous += stat.anonymousVisitors;
      totalLogins += stat.loginCount;
      totalNewSignups += stat.newSignups;
      totalNewAcademies += stat.newAcademies;
    }

    const totalVisitors = totalAnonymous + totalLogins;
    const count = dailyStats.length || 1;
    const avgDailyVisitors = Math.round(totalVisitors / count);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayStat = dailyStats.find((d) => d.date === todayStr) || {
      date: todayStr,
      anonymousVisitors: 0,
      loginCount: 0,
      newSignups: 0,
      newAcademies: 0,
    };

    return {
      totalVisitors,
      totalAnonymous,
      totalLogins,
      totalNewSignups,
      totalNewAcademies,
      avgDailyVisitors,
      todayVisitors: todayStat.anonymousVisitors + todayStat.loginCount,
      todayLogins: todayStat.loginCount,
      todayNewSignups: todayStat.newSignups,
      todayNewAcademies: todayStat.newAcademies,
      dailyStats,
    };
  },

  /**
   * 전체 학원 목록 조회
   */
  async getAcademies(params?: { search?: string; status?: string }): Promise<AdminAcademyItem[]> {
    const response = await api.get<AdminAcademyItem[]>('/admin/academies', { params });
    return response.data;
  },

  /**
   * 학원 상세 정보 조회
   */
  async getAcademyDetail(academyId: number): Promise<any> {
    const response = await api.get(`/admin/academies/${academyId}`);
    return response.data;
  },

  /**
   * 학원 운영 상태 변경 (정상 / 일시정지 / 대기)
   */
  async updateAcademyStatus(
    academyId: number,
    status: 'ACTIVE' | 'SUSPENDED' | 'PENDING',
    reason?: string,
  ): Promise<any> {
    const response = await api.patch(`/admin/academies/${academyId}/status`, {
      status,
      reason,
    });
    return response.data;
  },

  /**
   * 학원 요금제 등급 및 구독 정보 변경
   */
  async updateSubscription(
    academyId: number,
    dto: UpdateSubscriptionPayload,
  ): Promise<any> {
    const response = await api.patch(`/admin/academies/${academyId}/subscription`, dto);
    return response.data;
  },

  /**
   * 관리자 감사 로그 목록 조회
   */
  async getAuditLogs(limit: number = 20): Promise<AdminAuditLogItem[]> {
    const response = await api.get<AdminAuditLogItem[]>('/admin/audit-logs', {
      params: { limit },
    });
    return response.data;
  },
};
