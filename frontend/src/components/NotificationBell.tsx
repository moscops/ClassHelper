'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  CheckCircle2,
  DoorOpen,
  Info,
  Clock,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  notificationsService,
  NotificationItem,
  UnreadCountResponse,
} from '@/lib/notifications-service';
import { useAuthStore } from '@/stores/useAuthStore';

export function NotificationBell() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [unreadInfo, setUnreadInfo] = useState<UnreadCountResponse>({
    unreadCount: 0,
    unattendedAlertCount: 0,
    hasUnattendedAlert: false,
  });
  const [recentNotifications, setRecentNotifications] = useState<
    NotificationItem[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 30 seconds only when authenticated
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isHydrated, isAuthenticated]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const data = await notificationsService.getUnreadCount();
      setUnreadInfo(data);
    } catch (err) {
      // ignore silently if not logged in
    }
  };

  const loadRecentNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await notificationsService.getNotifications({
        limit: 5,
        page: 1,
      });
      setRecentNotifications(data.data);
    } catch (err) {
      console.error('Failed to load recent notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      loadRecentNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (item: NotificationItem) => {
    try {
      if (!item.isRead) {
        await notificationsService.markAsRead(item.id);
        setUnreadInfo((prev) => ({
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          unattendedAlertCount:
            item.type === 'UNATTENDED_ALERT'
              ? Math.max(0, prev.unattendedAlertCount - 1)
              : prev.unattendedAlertCount,
          hasUnattendedAlert:
            item.type === 'UNATTENDED_ALERT'
              ? prev.unattendedAlertCount - 1 > 0
              : prev.hasUnattendedAlert,
        }));
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
      }

      setIsOpen(false);

      if (
        item.type === 'UNATTENDED_ALERT' ||
        item.type === 'ATTENDANCE_CHECKIN' ||
        item.type === 'ATTENDANCE_CHECKOUT'
      ) {
        router.push('/attendance');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await notificationsService.markAllAsRead();
      setUnreadInfo({
        unreadCount: 0,
        unattendedAlertCount: 0,
        hasUnattendedAlert: false,
      });
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true })),
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date().getTime();
      const past = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - past) / 1000);

      if (diffSec < 60) return '방금 전';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
      return `${Math.floor(diffSec / 86400)}일 전`;
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'UNATTENDED_ALERT':
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'ATTENDANCE_CHECKIN':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'ATTENDANCE_CHECKOUT':
        return (
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <DoorOpen className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with Active Pulse if Unattended Alert is Active */}
      <button
        onClick={handleToggleOpen}
        aria-label="알림"
        className={`relative p-2 rounded-xl transition-all cursor-pointer border ${
          unreadInfo.hasUnattendedAlert
            ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
        } shadow-2xs`}
      >
        <Bell className="w-4 h-4" />

        {/* Badge */}
        {unreadInfo.unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-xs ${
              unreadInfo.hasUnattendedAlert
                ? 'bg-rose-600 animate-bounce'
                : 'bg-indigo-600'
            }`}
          >
            {unreadInfo.unreadCount > 99 ? '99+' : unreadInfo.unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover (Fixed in Top-Right below Header) */}
      {isOpen && (
        <div className="fixed top-[66px] right-4 sm:right-6 lg:right-8 w-80 sm:w-96 max-h-[calc(100vh-80px)] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                알림
              </span>
              {unreadInfo.unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {unreadInfo.unreadCount}건 미확인
                </span>
              )}
            </div>

            {unreadInfo.unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                {isMarkingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>모두 읽음</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs">알림을 불러오는 중...</span>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-1" />
                <p>새로운 알림이 없습니다.</p>
              </div>
            ) : (
              recentNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item)}
                  className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex gap-3 ${
                    !item.isRead
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                      : ''
                  }`}
                >
                  {getNotificationIcon(item.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs truncate ${
                          !item.isRead
                            ? 'font-bold text-slate-900 dark:text-white'
                            : 'font-medium text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {item.channel === 'KAKAO' && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold">
                          카카오 알림톡 발송됨
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>대시보드 알림 센터 바로가기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
