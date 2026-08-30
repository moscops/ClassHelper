import { api } from './api';

export type NotificationType =
  | 'UNATTENDED_ALERT'
  | 'ATTENDANCE_CHECKIN'
  | 'ATTENDANCE_CHECKOUT'
  | 'TUITION_DUE'
  | 'SYSTEM_NOTICE';

export type NotificationChannel = 'IN_APP' | 'KAKAO' | 'SMS';
export type NotificationStatus = 'SENT' | 'DELIVERED' | 'FAILED';

export interface NotificationStudentSummary {
  id: number;
  name: string;
  grade?: string | null;
  parentPhone: string;
}

export interface NotificationClassSummary {
  id: number;
  name: string;
  subject?: string | null;
  schedule?: string | null;
}

export interface NotificationItem {
  id: number;
  academyId: number;
  userId?: number | null;
  studentId?: number | null;
  classId?: number | null;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  message: string;
  targetPhone?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  student?: NotificationStudentSummary | null;
  class?: NotificationClassSummary | null;
}

export interface PaginatedNotificationResponse {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
  unattendedAlertCount: number;
  hasUnattendedAlert: boolean;
}

export interface QueryNotificationParams {
  type?: NotificationType;
  channel?: NotificationChannel;
  isRead?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export const notificationsService = {
  /**
   * 알림 목록 조회 (필터링 & 페이지네이션)
   */
  async getNotifications(
    params?: QueryNotificationParams,
  ): Promise<PaginatedNotificationResponse> {
    const query = new URLSearchParams();
    if (params) {
      if (params.type) query.append('type', params.type);
      if (params.channel) query.append('channel', params.channel);
      if (params.isRead !== undefined)
        query.append('isRead', params.isRead.toString());
      if (params.search) query.append('search', params.search);
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
    }
    const response = await api.get<PaginatedNotificationResponse>(
      `/notifications?${query.toString()}`,
    );
    return response.data;
  },

  /**
   * 안 읽은 알림 수 및 미등원 경고 집계 조회
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await api.get<UnreadCountResponse>(
      '/notifications/unread-count',
    );
    return response.data;
  },

  /**
   * 특정 알림 읽음 처리
   */
  async markAsRead(id: number): Promise<NotificationItem> {
    const response = await api.patch<NotificationItem>(
      `/notifications/${id}/read`,
    );
    return response.data;
  },

  /**
   * 전체 알림 일괄 읽음 처리
   */
  async markAllAsRead(): Promise<{ success: boolean; count: number }> {
    const response = await api.patch<{ success: boolean; count: number }>(
      '/notifications/read-all',
    );
    return response.data;
  },

  /**
   * 알림 삭제
   */
  async deleteNotification(
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/notifications/${id}`,
    );
    return response.data;
  },

  /**
   * 실패한 카카오/SMS 알림 재발송
   */
  async retryNotification(id: number): Promise<NotificationItem> {
    const response = await api.post<NotificationItem>(
      `/notifications/${id}/retry`,
    );
    return response.data;
  },
};
