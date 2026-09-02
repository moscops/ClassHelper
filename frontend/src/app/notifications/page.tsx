'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  DoorOpen,
  Info,
  Search,
  Trash2,
  RefreshCw,
  CheckCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  MessageSquare,
  ArrowLeft,
  ServerCrash,
  Database,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSystemAlertStore } from '@/stores/useSystemAlertStore';
import {
  notificationsService,
  NotificationItem,
  NotificationType,
  NotificationChannel,
} from '@/lib/notifications-service';
import { AppLayout } from '@/components/common/AppLayout';

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const {
    alert: systemAlert,
    hasError: hasSystemError,
    markAsRead: markSystemAlertAsRead,
    clearError: clearSystemAlert,
  } = useSystemAlertStore();

  // State: List & Filters
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs & Search
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNATTENDED' | 'KAKAO' | 'ATTENDANCE'>('ALL');
  const [isReadFilter, setIsReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Action Loading states
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Auth Guard
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch notifications
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadNotifications();
    }
  }, [isHydrated, isAuthenticated, activeTab, isReadFilter, debouncedSearch, currentPage]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      let typeParam: NotificationType | undefined = undefined;
      let channelParam: NotificationChannel | undefined = undefined;

      if (activeTab === 'UNATTENDED') {
        typeParam = 'UNATTENDED_ALERT';
      } else if (activeTab === 'KAKAO') {
        channelParam = 'KAKAO';
      } else if (activeTab === 'ATTENDANCE') {
        typeParam = 'ATTENDANCE_CHECKIN';
      }

      let isReadParam: boolean | undefined = undefined;
      if (isReadFilter === 'UNREAD') isReadParam = false;
      if (isReadFilter === 'READ') isReadParam = true;

      const res = await notificationsService.getNotifications({
        type: typeParam,
        channel: channelParam,
        isRead: isReadParam,
        search: debouncedSearch.trim() || undefined,
        page: currentPage,
        limit: 15,
      });

      setNotifications(res.data);
      setTotalCount(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    setActionLoadingId(id);
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 알림을 삭제하시겠습니까?')) return;
    setActionLoadingId(id);
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      alert('알림 삭제 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRetryKakao = async (id: number) => {
    setActionLoadingId(id);
    try {
      const updated = await notificationsService.retryNotification(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? updated : n)),
      );
      alert('카카오 알림톡이 성공적으로 재발송되었습니다.');
    } catch (err) {
      alert('알림 재발송 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatFullDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
        d.getDate(),
      ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
        d.getMinutes(),
      ).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'UNATTENDED_ALERT':
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'ATTENDANCE_CHECKIN':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'ATTENDANCE_CHECKOUT':
        return (
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <DoorOpen className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <AppLayout currentPath="/notifications">
      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard"
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>알림 관리 센터</span>
                {hasSystemError && (
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center animate-bounce shadow-sm" title="데이터베이스 / 서버 통신 장애 발생">
                    !
                  </span>
                )}
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
                  총 {totalCount}건
                </span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              미등원 경고 알림, 카카오 안심 알림톡 발송 현황 및 학원 주요 알림 내역을 통합 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll || notifications.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isMarkingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>전체 읽음 처리</span>
            </button>

            <button
              onClick={() => loadNotifications()}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 0. Critical System & DB Alert Banner (If Active) */}
        {systemAlert && (
          <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shadow-xs animate-bounce">
                  !
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950 dark:text-rose-100 flex items-center gap-2">
                    <span>{systemAlert.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-extrabold">
                      장애 감지됨
                    </span>
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                    {systemAlert.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!systemAlert.isRead && (
                  <button
                    type="button"
                    onClick={() => markSystemAlertAsRead()}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-300 dark:border-rose-700 hover:bg-rose-50 cursor-pointer shadow-2xs"
                  >
                    확인 완료
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => clearSystemAlert()}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 cursor-pointer"
                  title="알림 지우기"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <button
              onClick={() => {
                setActiveTab('ALL');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              전체 알림
            </button>
            <button
              onClick={() => {
                setActiveTab('UNATTENDED');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'UNATTENDED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>미등원/지각 경고</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('KAKAO');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'KAKAO'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>카카오 알림톡 발송 이력</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('ATTENDANCE');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ATTENDANCE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>등/하원 완료</span>
            </button>
          </div>

          {/* Search & Read Status Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="제목, 내용, 학생 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs">
                <button
                  onClick={() => {
                    setIsReadFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    isReadFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => {
                    setIsReadFilter('UNREAD');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    isReadFilter === 'UNREAD'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  안 읽음
                </button>
                <button
                  onClick={() => {
                    setIsReadFilter('READ');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    isReadFilter === 'READ'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  읽음
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-medium">알림 목록을 불러오고 있습니다...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 space-y-2">
              <Bell className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-1" />
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                조회된 알림이 없습니다.
              </h3>
              <p className="text-xs">선택하신 조건에 해당하는 알림 내역이 없습니다.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  !item.isRead
                    ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {getNotificationIcon(item.type)}

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-sm ${
                          !item.isRead
                            ? 'font-bold text-slate-900 dark:text-white'
                            : 'font-semibold text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {item.title}
                      </h3>

                      {!item.isRead && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                          NEW
                        </span>
                      )}

                      {item.channel === 'KAKAO' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-amber-600" />
                          <span>카카오 알림톡</span>
                        </span>
                      )}

                      <span className="text-xs text-slate-400 font-mono">
                        {formatFullDateTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                      {item.message}
                    </p>

                    {/* Metadata summary (Student / Class Info) */}
                    {(item.student || item.class || item.targetPhone) && (
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.student && (
                          <span>
                            대상 학생: <b className="text-slate-700 dark:text-slate-300">{item.student.name}</b>
                          </span>
                        )}
                        {item.class && (
                          <span>
                            수업 반: <b className="text-slate-700 dark:text-slate-300">{item.class.name}</b>
                          </span>
                        )}
                        {item.targetPhone && (
                          <span>
                            발송처: <b className="font-mono text-slate-700 dark:text-slate-300">{item.targetPhone}</b>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.status === 'FAILED' && (
                    <button
                      onClick={() => handleRetryKakao(item.id)}
                      disabled={actionLoadingId === item.id}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>재발송</span>
                    </button>
                  )}

                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(item.id)}
                      disabled={actionLoadingId === item.id}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>읽음</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={actionLoadingId === item.id}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    title="알림 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              전체 {totalCount}개 중 {(currentPage - 1) * 15 + 1} -{' '}
              {Math.min(currentPage * 15, totalCount)}번째 표시
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs px-3 font-semibold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
