'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { attendanceService } from '@/lib/attendance-service';
import { notificationsService } from '@/lib/notifications-service';

interface NavStatusState {
  hasUnattendedAlert: boolean;
  unattendedCount: number;
  unreadNotificationCount: number;
  updateStatus: () => Promise<void>;
}

export const useNavStatusStore = create<NavStatusState>()(
  persist(
    (set, get) => ({
      hasUnattendedAlert: false,
      unattendedCount: 0,
      unreadNotificationCount: 0,

      updateStatus: async () => {
        try {
          const [attRes, notifRes] = await Promise.all([
            attendanceService.getUnattendedStatus().catch(() => null),
            notificationsService.getUnreadCount().catch(() => null),
          ]);

          set({
            hasUnattendedAlert:
              attRes?.isUnattendedAlertActive ?? get().hasUnattendedAlert,
            unattendedCount: attRes?.unattendedCount ?? get().unattendedCount,
            unreadNotificationCount:
              notifRes?.unreadCount ?? get().unreadNotificationCount,
          });
        } catch {
          // ignore network error during background sync
        }
      },
    }),
    {
      name: 'classhelper_nav_status_store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
