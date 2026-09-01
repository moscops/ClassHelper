'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  BookOpen,
  CalendarCheck2,
  AlertTriangle,
  Bell,
  Search,
  Trash2,
  RefreshCw,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  DoorOpen,
  Info,
  Send,
  Loader2,
  Sparkles,
  ArrowUpRight,
  UserPlus,
  PlusCircle,
  ClipboardList,
  CheckCircle2,
  Calendar,
  CreditCard,
  Crown,
  Zap,
  X,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/lib/auth-service';
import {
  notificationsService,
  NotificationItem,
  NotificationType,
  NotificationChannel,
} from '@/lib/notifications-service';
import { attendanceService, UnattendedStatusResponse } from '@/lib/attendance-service';
import { AppLayout } from '@/components/common/AppLayout';

export default function DashboardPage() {
  const router = useRouter();
  const { user, academy, isAuthenticated, isHydrated, setAcademy } = useAuthStore();
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // State: Unattended Alert Status
  const [unattendedStatus, setUnattendedStatus] = useState<UnattendedStatusResponse>({
    isUnattendedAlertActive: false,
    unattendedCount: 0,
    unattendedStudents: [],
  });

  // State: Notification Management Center
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalNotificationsCount, setTotalNotificationsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  // Tabs & Search for Notifications
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNATTENDED' | 'KAKAO' | 'ATTENDANCE'>('ALL');
  const [isReadFilter, setIsReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Action Loading states
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Today's formatted date
  const [todayDateStr, setTodayDateStr] = useState('');

  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    setTodayDateStr(today.toLocaleDateString('ko-KR', options));
  }, []);

  // Authentication guard
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Load Unattended Status & Sync Latest Academy Profile
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadUnattendedStatus();
      authService.getMe().then((me) => {
        if (me.academy) {
          setAcademy(me.academy);
        }
      }).catch(() => {});
      const interval = setInterval(loadUnattendedStatus, 20000);
      return () => clearInterval(interval);
    }
  }, [isHydrated, isAuthenticated, setAcademy]);

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

  const loadUnattendedStatus = async () => {
    try {
      const data = await attendanceService.getUnattendedStatus();
      setUnattendedStatus(data);
    } catch {
      // ignore
    }
  };

  const loadNotifications = async () => {
    setIsLoadingNotifications(true);
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
        limit: 10,
      });

      setNotifications(res.data);
      setTotalNotificationsCount(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load notifications in dashboard:', err);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    setActionLoadingId(id);
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      loadUnattendedStatus();
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
      loadUnattendedStatus();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDeleteNotification = async (id: number) => {
    if (!confirm('이 알림을 삭제하시겠습니까?')) return;
    setActionLoadingId(id);
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalNotificationsCount((prev) => Math.max(0, prev - 1));
      loadUnattendedStatus();
    } catch {
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
    } catch {
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

  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-2.5">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400">학원 대시보드를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout currentPath="/dashboard">
      <main className="flex-1 relative overflow-hidden py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 relative z-10">
          {/* Dashboard Greeting Header & Quick Actions */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>학원 시스템 정상 가동 중</span>
                  </div>
                  {todayDateStr && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{todayDateStr}</span>
                    </div>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  반갑습니다, <span className="text-indigo-600 dark:text-indigo-400">{user.name}</span> {user.role === 'OWNER' ? '원장님' : '선생님'}! ✨
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{academy?.name}</span>의 1초 출결, 수업 진도, 원비 수납 현황 및 실시간 알림을 스마트하게 관리하세요.
                </p>
              </div>

              {/* Subscription Plan Widget */}
              {(() => {
                const tier = academy?.subscription?.tier ?? 'FREE';
                const isCanceled = academy?.subscription?.status === 'CANCELED';

                let planDetails = {
                  name: 'Free 플랜',
                  desc: '원생 50명 제한 · 기본 기능',
                  badge: '무료',
                  color: 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300',
                  icon: Sparkles,
                  iconColor: 'text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700',
                };

                if (tier === 'PRO') {
                  planDetails = {
                    name: 'Pro 플랜',
                    desc: '원생 무제한 · 전 기능 해제',
                    badge: '프로',
                    color: 'border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200',
                    icon: Zap,
                    iconColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60',
                  };
                } else if (tier === 'ENTERPRISE') {
                  planDetails = {
                    name: 'Enterprise 플랜',
                    desc: '원생 무제한 · 본/분원 통합 관리',
                    badge: '엔터프라이즈',
                    color: 'border-purple-200 dark:border-purple-800/80 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200',
                    icon: Crown,
                    iconColor: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/60',
                  };
                }

                const PlanIcon = planDetails.icon;

                return (
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shrink-0 transition-all ${planDetails.color}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${planDetails.iconColor}`}>
                        <PlanIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs">{planDetails.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-white dark:bg-slate-900/80 shadow-2xs">
                            {isCanceled ? '구독 취소됨' : planDetails.badge}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-80 mt-0.5">{planDetails.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPlanModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer shrink-0"
                    >
                      플랜 혜택 보기
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Emergency Unattended Warning Callout (If active) */}
          {unattendedStatus.isUnattendedAlertActive && (
            <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 shadow-md animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span>수업 시작 시간 초과 미등원 경고 ({unattendedStatus.unattendedCount}명)</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold">
                        긴급 확인 필요
                      </span>
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                      예정된 수업 시작 시간이 지났으나 아직 출결하지 않은 원생이 감지되었습니다.
                    </p>
                  </div>
                </div>

                <Link
                  href="/attendance"
                  className="self-end sm:self-center px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
                >
                  지금 즉시 출결 확인하기 →
                </Link>
              </div>
            </div>
          )}

          {/* 4 Core Domain Cards */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>핵심 학원 관리 메뉴</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* 1. 원생 관리 */}
              <Link
                href="/students"
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md transition-all shadow-2xs flex flex-col justify-between interactive-card"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3.5 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    원생 관리
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    재원생 등록, 학년/상태 필터링 및 학부모 비상 연락처 관리
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  <span>원생 목록</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>

              {/* 2. 반 & 수강 배정 */}
              <Link
                href="/classes"
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 hover:shadow-md transition-all shadow-2xs flex flex-col justify-between interactive-card"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3.5 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    반 & 수강 배정
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    개설 반 관리, 담당 강사 배정, 수강생 매핑 및 시간표
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-semibold">
                  <span>반 & 수강생</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>

              {/* 3. 1초 출결 체크 */}
              <Link
                href="/attendance"
                className={`group p-5 rounded-2xl transition-all shadow-2xs flex flex-col justify-between interactive-card border ${
                  unattendedStatus.isUnattendedAlertActive
                    ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 ring-2 ring-rose-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-md'
                }`}
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 transition-transform group-hover:scale-105 ${
                      unattendedStatus.isUnattendedAlertActive
                        ? 'bg-rose-600 text-white shadow-xs animate-bounce'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {unattendedStatus.isUnattendedAlertActive ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CalendarCheck2 className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <h3
                      className={`text-sm font-bold transition-colors ${
                        unattendedStatus.isUnattendedAlertActive
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                      }`}
                    >
                      1초 출결 체크
                    </h3>
                    {unattendedStatus.isUnattendedAlertActive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-600 text-white">
                        {unattendedStatus.unattendedCount}명
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      unattendedStatus.isUnattendedAlertActive
                        ? 'text-rose-600/90 dark:text-rose-300/90 font-medium'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {unattendedStatus.isUnattendedAlertActive
                      ? '수업 시작 시간 초과 미등원 원생 감지'
                      : '원터치 모바일 출결(출석, 결석, 지각, 조퇴)'}
                  </p>
                </div>

                <div
                  className={`mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold ${
                    unattendedStatus.isUnattendedAlertActive
                      ? 'border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-bold'
                      : 'border-slate-100 dark:border-slate-800 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <span>{unattendedStatus.isUnattendedAlertActive ? '미등원 확인' : '출결 체크'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>

              {/* 4. 수업 일지 & 과제 */}
              <Link
                href="/class-logs"
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all shadow-2xs flex flex-col justify-between interactive-card"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3.5 group-hover:scale-105 transition-transform">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    수업 일지 & 과제
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    회차별 교재 진도, 과제 공지 및 1초 숙제 검사
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  <span>수업 일지</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>

              {/* 5. 수강료 & 수납 관리 */}
              <Link
                href="/tuition"
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all shadow-2xs flex flex-col justify-between interactive-card"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3.5 group-hover:scale-105 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    수강료 & 수납
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    월간 청구서 자동 발행, 분할 수납 처리 및 미납 알림톡
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  <span>수강료 관리</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>
            </div>
          </div>

          {/* 5. 실시간 알림 및 카카오 안심 알림톡 관리 센터 */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>실시간 알림 및 카카오 안심 알림톡 관리 센터</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
                    총 {totalNotificationsCount}건
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  수업 미등원 경고 알림, 카카오 안심 알림톡 발송 현황 및 학원 주요 알림 내역을 실시간으로 관리합니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll || notifications.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isMarkingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                  <span>전체 읽음</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadNotifications()}
                  disabled={isLoadingNotifications}
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
                  title="새로고침"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingNotifications ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
              {/* Category Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
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
                  type="button"
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
                  type="button"
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
                  type="button"
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
                    className="w-full pl-9.5 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs">
                    <button
                      type="button"
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
                      type="button"
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
                      안 읽은 알림
                    </button>
                    <button
                      type="button"
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
                      읽은 알림
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            {isLoadingNotifications ? (
              <div className="py-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">알림 목록을 불러오고 있습니다...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">등록된 알림이 없습니다</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  {searchTerm || isReadFilter !== 'ALL' || activeTab !== 'ALL'
                    ? '조건에 부합하는 알림 검색 결과가 없습니다. 검색어나 필터를 변경해보세요.'
                    : '출결 상태 변화나 미등원 학생 발생 시 실시간 알림이 여기에 기록됩니다.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((item) => {
                  const isItemLoading = actionLoadingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        !item.isRead
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-800/60'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {getNotificationIcon(item.type)}

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {!item.isRead && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                            )}
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.title}
                            </h3>

                            {/* Channel Badge */}
                            {item.channel === 'KAKAO' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                📱 카카오 알림톡
                              </span>
                            )}
                            {item.channel === 'SMS' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                💬 SMS 문자
                              </span>
                            )}

                            {/* Status Badge */}
                            {item.status === 'SENT' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                발송완료
                              </span>
                            )}
                            {item.status === 'FAILED' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                발송실패
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                            {item.message}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                            {item.student && (
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                대상 원생: {item.student.name} ({item.student.grade})
                              </span>
                            )}
                            {item.class && (
                              <span>수업 반: {item.class.name}</span>
                            )}
                            {item.targetPhone && (
                              <span>수신번호: {item.targetPhone}</span>
                            )}
                            <span>{formatFullDateTime(item.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {item.status === 'FAILED' && (
                          <button
                            type="button"
                            onClick={() => handleRetryKakao(item.id)}
                            disabled={isItemLoading}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isItemLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>재발송</span>
                          </button>
                        )}

                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(item.id)}
                            disabled={isItemLoading}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            읽음
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteNotification(item.id)}
                          disabled={isItemLoading}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      총 {totalNotificationsCount}개 중 {(currentPage - 1) * 10 + 1} -{' '}
                      {Math.min(currentPage * 10, totalNotificationsCount)}개 표시
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg font-semibold transition-colors cursor-pointer ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Plan Information & Benefits Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    ClassHelper 요금제 플랜 및 혜택 안내
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    학원 규모와 운영 방식에 최적화된 맞춤형 플랜을 확인해보세요.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 3 Plans */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. FREE Plan */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    (academy?.subscription?.tier || 'FREE') === 'FREE'
                      ? 'border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 ring-2 ring-slate-400/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        FREE
                      </span>
                      {(academy?.subscription?.tier || 'FREE') === 'FREE' && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          현재 이용 중
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                      무료 체험
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                      소규모 교습소 및 초기 도입 학원을 위한 기본 플랜
                    </p>

                    <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>원생 최대 50명 등록</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>단일 학원 운영</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>1초 출결 & 수업 일지</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 2. PRO Plan */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                    academy?.subscription?.tier === 'PRO'
                      ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/50 ring-2 ring-indigo-500/40 shadow-xs'
                      : 'border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-50/20 dark:bg-indigo-950/20'
                  }`}
                >
                  <div className="absolute -right-6 top-3 rotate-45 bg-indigo-600 text-white text-[9px] font-bold px-7 py-0.5 shadow-2xs">
                    인기
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>PRO</span>
                      </span>
                      {academy?.subscription?.tier === 'PRO' && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                          현재 이용 중
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                      프로 플랜
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                      성장하는 일반 종합/단과 학원에 가장 최적화된 무제한 플랜
                    </p>

                    <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="font-bold">원생 인원 무제한</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>카카오 알림톡 자동 발송</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>수강료 복합 수납 & 청구서</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>과제 검사 및 상세 리포트</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 3. ENTERPRISE Plan */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    academy?.subscription?.tier === 'ENTERPRISE'
                      ? 'border-purple-500 dark:border-purple-400 bg-purple-50/60 dark:bg-purple-950/50 ring-2 ring-purple-500/40 shadow-xs'
                      : 'border-purple-200/80 dark:border-purple-800/60 bg-purple-50/20 dark:bg-purple-950/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5" />
                        <span>ENTERPRISE</span>
                      </span>
                      {academy?.subscription?.tier === 'ENTERPRISE' && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                          현재 이용 중
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                      엔터프라이즈
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                      본원 및 분원 통합 관리가 필요한 대형 학원/프랜차이즈 전용
                    </p>

                    <ul className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="font-bold">원생 & 강사 무제한</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>본원/직영 분원 통합 관리</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>전담 기술 지원 & 맞춤형 기능</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Notice Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  요금제 등급 업그레이드 또는 분원 연동을 원하시면 ClassHelper 플랫폼 고객센터 또는 전담 매니저에게 문의해주시면 즉시 반영해드립니다.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
