'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck2,
  LogOut,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
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
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';

export default function DashboardPage() {
  const router = useRouter();
  const { user, academy, isAuthenticated, isHydrated, logout } = useAuthStore();

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

  // Authentication guard
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Load Unattended Status
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadUnattendedStatus();
      const interval = setInterval(loadUnattendedStatus, 20000);
      return () => clearInterval(interval);
    }
  }, [isHydrated, isAuthenticated]);

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

  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-2.5">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400">인증 상태를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await authService.logout();
    logout();
    router.push('/login');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          label: '플랫폼 관리자',
          color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'OWNER':
        return {
          label: '원장님 (OWNER)',
          color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'ADMIN':
        return {
          label: '실장/관리자 (ADMIN)',
          color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'TEACHER':
        return {
          label: '담당 강사 (TEACHER)',
          color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'STAFF':
        return {
          label: '조교/직원 (STAFF)',
          color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      default:
        return {
          label: role,
          color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
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

  const roleBadge = getRoleBadge(user.role);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
              </span>
            </Link>

            {academy && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{academy.name}</span>
              </div>
            )}

            <nav className="hidden md:flex items-center gap-1 ml-2">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 transition-colors"
              >
                대시보드
              </Link>
              <Link
                href="/students"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                원생 관리
              </Link>
              <Link
                href="/classes"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                반 & 수강생 관리
              </Link>
              <Link
                href="/attendance"
                className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  unattendedStatus.isUnattendedAlertActive
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 animate-pulse'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>1초 출결 체크</span>
                {unattendedStatus.isUnattendedAlertActive && (
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
                )}
              </Link>
              <Link
                href="/class-logs"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                수업 일지 & 과제
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            {user.role === 'SUPER_ADMIN' && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs shadow-purple-600/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>관리자 포털로 돌아가기</span>
              </Link>
            )}

            {/* Notification Bell Dropdown */}
            <NotificationBell />

            <ThemeToggle />

            <div className="hidden md:flex flex-col items-end mr-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</span>
            </div>

            <span
              className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${roleBadge.color}`}
            >
              {roleBadge.label}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden py-8">
        <div className="absolute inset-0 bg-dot-vignette pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 relative z-10">
          {/* Dashboard Greeting Header */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>학원 관리 시스템 정상 가동 중</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  안녕하세요, <span className="text-indigo-600 dark:text-indigo-400">{user.name}</span> {user.role === 'OWNER' ? '원장님' : '선생님'}!
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{academy?.name}</span>의 출결, 수업 진도, 원비 수납 현황 및 실시간 알림을 한눈에 관리할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 4 Major Feature Cards */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
              <span>핵심 4대 관리 기능</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <Link
                href="/students"
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700/50 hover:shadow-sm transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    원생 관리
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    재원생 등록, 학년/상태 필터링 및 학부모 비상 연락처 관리
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  <span>원생 관리 바로가기</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              <Link
                href="/classes"
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 hover:shadow-md transition-all shadow-xs flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    반 & 수강 배정
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    개설 반 관리, 담당 강사 배정, 수강생 매핑 및 시간표
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-semibold">
                  <span>반 & 수강생 관리 바로가기</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>

              {/* 3. 1초 출결 체크 (미등원 경고 시 붉은 펄스 신호로 동적 전환) */}
              <Link
                href="/attendance"
                className={`p-5 rounded-xl transition-all shadow-xs flex flex-col justify-between group cursor-pointer border ${
                  unattendedStatus.isUnattendedAlertActive
                    ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 ring-2 ring-rose-500/20 shadow-md animate-pulse'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-md'
                }`}
              >
                <div>
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${
                      unattendedStatus.isUnattendedAlertActive
                        ? 'bg-rose-600 text-white shadow-xs animate-bounce'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {unattendedStatus.isUnattendedAlertActive ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <CalendarCheck2 className="w-4 h-4" />
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
                        {unattendedStatus.unattendedCount}명 미등원
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
                      ? '수업 시간이 지났으나 아직 출결하지 않은 원생이 있습니다! 즉시 확인하세요.'
                      : '원터치 모바일 출결(출석, 결석, 지각, 조퇴) 및 보강 관리'}
                  </p>
                </div>

                <div
                  className={`mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold ${
                    unattendedStatus.isUnattendedAlertActive
                      ? 'border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-bold'
                      : 'border-slate-100 dark:border-slate-800 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <span>
                    {unattendedStatus.isUnattendedAlertActive
                      ? '미등원 출결 확인하기'
                      : '출결 체크 바로가기'}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>

              {/* 4. 수업 일지 & 과제 관리 */}
              <Link
                href="/class-logs"
                className="group p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    수업 일지 & 과제 관리
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    회차별 교재 진도, 과제 공지 및 원생별 1초 숙제 검사·피드백
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  <span>수업 일지 작성하기</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>
            </div>
          </div>

          {/* 5. 통합 알림 및 카카오 안심 알림톡 관리 센터 (Moved into Dashboard) */}
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
    </div>
  );
}



