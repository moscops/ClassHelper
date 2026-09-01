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

export const adminService = {
  /**
   * 플랫폼 전체 요약 통계
   */
  async getPlatformStats(): Promise<PlatformStats> {
    const response = await api.get<PlatformStats>('/admin/stats');
    return response.data;
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
