import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SystemAlert {
  id: string;
  type: 'DB_CONNECTION_ERROR' | 'SERVER_ERROR' | 'NETWORK_ERROR';
  title: string;
  message: string;
  endpoint?: string;
  isRead: boolean;
  createdAt: string;
}

interface SystemAlertState {
  alerts: SystemAlert[];
  unreadCount: number;
  addAlert: (alert: Omit<SystemAlert, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAlert: (id: string) => void;
  clearAll: () => void;
}

export const useSystemAlertStore = create<SystemAlertState>()(
  persist(
    (set, get) => ({
      alerts: [],
      unreadCount: 0,

      addAlert: (newAlert) => {
        const now = new Date().toISOString();
        const alerts = get().alerts;

        // 중복 방지: 동일 엔드포인트의 미확인 알림이 1분 이내에 있으면 중복 등록 방지
        const isRecentDuplicate = alerts.some(
          (a) =>
            a.endpoint === newAlert.endpoint &&
            !a.isRead &&
            Date.now() - new Date(a.createdAt).getTime() < 60000,
        );

        if (isRecentDuplicate) return;

        const alertItem: SystemAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...newAlert,
          isRead: false,
          createdAt: now,
        };

        const updatedAlerts = [alertItem, ...alerts].slice(0, 30); // 최대 30개 보관
        set({
          alerts: updatedAlerts,
          unreadCount: updatedAlerts.filter((a) => !a.isRead).length,
        });
      },

      markAsRead: (id) => {
        const updated = get().alerts.map((a) =>
          a.id === id ? { ...a, isRead: true } : a,
        );
        set({
          alerts: updated,
          unreadCount: updated.filter((a) => !a.isRead).length,
        });
      },

      markAllAsRead: () => {
        const updated = get().alerts.map((a) => ({ ...a, isRead: true }));
        set({
          alerts: updated,
          unreadCount: 0,
        });
      },

      clearAlert: (id) => {
        const updated = get().alerts.filter((a) => a.id !== id);
        set({
          alerts: updated,
          unreadCount: updated.filter((a) => !a.isRead).length,
        });
      },

      clearAll: () => {
        set({ alerts: [], unreadCount: 0 });
      },
    }),
    {
      name: 'classhelper_system_alerts',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
