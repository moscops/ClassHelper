'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Users,
  BookOpen,
  CalendarCheck2,
  MessageSquare,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  History,
  Sparkles,
  Crown,
  Zap,
  Shield,
  Edit3,
  X,
  Calendar,
  Layers,
  Activity,
  Server,
  FileText,
  UserCheck,
  CreditCard,
  ChevronRight,
  Database,
  ArrowUpRight,
  ShieldCheck,
  Phone,
  MapPin,
  Download,
  ArrowDown,
  ArrowUp,
  BarChart2,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  adminService,
  PlatformStats,
  AdminAcademyItem,
  AdminAuditLogItem,
  UpdateSubscriptionPayload,
  DailyAnalyticsStat,
  VisitorAnalyticsSummary,
} from '@/lib/admin-service';
import { PlanTier, SubscriptionStatus } from '@/types/auth';
import { AppLayout } from '@/components/common/AppLayout';

type AdminTab = 'overview' | 'visitors' | 'academies' | 'subscriptions' | 'audit-logs' | 'system';

function AdminPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') as AdminTab | null;
  const activeTab: AdminTab =
    rawTab && ['overview', 'visitors', 'academies', 'subscriptions', 'audit-logs', 'system'].includes(rawTab)
      ? rawTab
      : 'overview';

  const { user, isAuthenticated, isHydrated } = useAuthStore();

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [academies, setAcademies] = useState<AdminAcademyItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [planFilter, setPlanFilter] = useState<'ALL' | PlanTier>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Academy Detail Modal State
  const [selectedAcademyIdForDetail, setSelectedAcademyIdForDetail] = useState<number | null>(null);
  const [academyDetail, setAcademyDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Subscription Edit Modal State
  const [editingAcademy, setEditingAcademy] = useState<AdminAcademyItem | null>(null);
  const [modalTier, setModalTier] = useState<PlanTier>('FREE');
  const [modalStatus, setModalStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [isUnlimitedExpiry, setIsUnlimitedExpiry] = useState<boolean>(true);
  const [modalExpiresAt, setModalExpiresAt] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalReason, setModalReason] = useState<string>('');
  const [isSavingSubscription, setIsSavingSubscription] = useState<boolean>(false);

  // Visitor Analytics State
  const [visitorSummary, setVisitorSummary] = useState<VisitorAnalyticsSummary | null>(null);
  const [isLoadingVisitors, setIsLoadingVisitors] = useState<boolean>(false);
  const [visitorDatePreset, setVisitorDatePreset] = useState<'7d' | '14d' | '30d' | 'custom'>('14d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [visitorSearchTerm, setVisitorSearchTerm] = useState<string>('');
  const [visitorSortOrder, setVisitorSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedVisitorDate, setSelectedVisitorDate] = useState<DailyAnalyticsStat | null>(null);

  const loadVisitorData = async (preset = visitorDatePreset, start?: string, end?: string) => {
    setIsLoadingVisitors(true);
    try {
      let startStr = start;
      let endStr = end;
      if (preset !== 'custom') {
        const now = new Date();
        const days = preset === '7d' ? 6 : preset === '14d' ? 13 : 29;
        const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        startStr = fromDate.toISOString().split('T')[0];
        endStr = now.toISOString().split('T')[0];
      }
      const data = await adminService.getVisitorAnalytics(startStr, endStr);
      setVisitorSummary(data);
      if (data.dailyStats.length > 0) {
        setSelectedVisitorDate(data.dailyStats[0]);
      }
    } catch (err) {
      console.error('Failed to load visitor analytics:', err);
    } finally {
      setIsLoadingVisitors(false);
    }
  };

  const handleDownloadVisitorCsv = () => {
    if (!visitorSummary?.dailyStats) return;
    const header = '날짜,총방문자(UV),비로그인방문자,로그인교직원,신규가입자,신규개설학원\n';
    const rows = visitorSummary.dailyStats.map(d =>
      `${d.date},${d.anonymousVisitors + d.loginCount},${d.anonymousVisitors},${d.loginCount},${d.newSignups},${d.newAcademies}`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classhelper_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Authentication & Role verification
  useEffect(() => {
    if (isHydrated) {
      if (!isAuthenticated || !user) {
        router.replace('/login');
      } else if (user.mustChangePassword) {
        router.replace('/change-password');
      } else if (user.role !== 'SUPER_ADMIN') {
        router.replace('/dashboard');
      }
    }
  }, [isHydrated, isAuthenticated, user, router]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsData, academiesData, auditLogsData] = await Promise.all([
        adminService.getPlatformStats().catch(() => null),
        adminService.getAcademies().catch(() => []),
        adminService.getAuditLogs(50).catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setAcademies(academiesData);
      setAuditLogs(auditLogsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN') {
      loadAdminData();
      loadVisitorData();
    }
  }, [isAuthenticated, user]);

  // ESC to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingAcademy(null);
        setSelectedAcademyIdForDetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenAcademyDetail = async (academyId: number) => {
    setSelectedAcademyIdForDetail(academyId);
    setIsLoadingDetail(true);
    try {
      const detail = await adminService.getAcademyDetail(academyId);
      setAcademyDetail(detail);
    } catch (err) {
      console.error('Failed to fetch academy detail:', err);
      alert('학원 세부 정보를 불러오지 못했습니다.');
      setSelectedAcademyIdForDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleToggleAcademyStatus = async (academy: AdminAcademyItem) => {
    const nextStatus = academy.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionName = nextStatus === 'SUSPENDED' ? '일시 정지' : '정상 운영 복구';

    if (!confirm(`[${academy.name}] 학원을 ${actionName} 처리하시겠습니까?`)) {
      return;
    }

    setActionLoadingId(academy.id);
    try {
      await adminService.updateAcademyStatus(
        academy.id,
        nextStatus,
        `관리자 수동 ${actionName} 처리`,
      );
      await loadAdminData();
      if (selectedAcademyIdForDetail === academy.id) {
        const updated = await adminService.getAcademyDetail(academy.id);
        setAcademyDetail(updated);
      }
    } catch {
      alert('학원 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenSubscriptionModal = (academy: AdminAcademyItem) => {
    const sub = academy.subscription;
    setEditingAcademy(academy);
    setModalTier(sub?.tier ?? 'FREE');
    setModalStatus(sub?.status ?? 'ACTIVE');
    if (sub?.expiresAt) {
      setIsUnlimitedExpiry(false);
      const datePart = sub.expiresAt.split('T')[0];
      setModalExpiresAt(datePart);
    } else {
      setIsUnlimitedExpiry(true);
      setModalExpiresAt('');
    }
    setModalNotes(sub?.notes ?? '');
    setModalReason('');
  };

  const handleCloseSubscriptionModal = () => {
    if (isSavingSubscription) return;
    setEditingAcademy(null);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAcademy) return;

    setIsSavingSubscription(true);
    try {
      const payload: UpdateSubscriptionPayload = {
        tier: modalTier,
        status: modalStatus,
        expiresAt: isUnlimitedExpiry || !modalExpiresAt ? undefined : modalExpiresAt,
        notes: modalNotes.trim() || undefined,
        reason: modalReason.trim() || undefined,
      };

      await adminService.updateSubscription(editingAcademy.id, payload);
      await loadAdminData();
      if (selectedAcademyIdForDetail === editingAcademy.id) {
        const updated = await adminService.getAcademyDetail(editingAcademy.id);
        setAcademyDetail(updated);
      }
      setEditingAcademy(null);
    } catch (err) {
      console.error('Failed to update subscription:', err);
      alert('요금제 구독 정보 변경 중 오류가 발생했습니다.');
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const getTierBadge = (tier?: PlanTier, status?: SubscriptionStatus, expiresAt?: string | null) => {
    const isCanceled = status === 'CANCELED';
    const effectiveTier = tier ?? 'FREE';

    let tierConfig = {
      label: 'Free 무료',
      icon: Sparkles,
      color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    };

    if (effectiveTier === 'PRO') {
      tierConfig = {
        label: 'Pro 프로',
        icon: Zap,
        color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      };
    } else if (effectiveTier === 'ENTERPRISE') {
      tierConfig = {
        label: 'Enterprise',
        icon: Crown,
        color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      };
    }

    const Icon = tierConfig.icon;

    return (
      <div className="flex flex-col items-center gap-1">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold text-[11px] border ${
            isCanceled
              ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-300 dark:border-slate-700 line-through'
              : tierConfig.color
          }`}
        >
          <Icon className="w-3 h-3" />
          <span>{tierConfig.label}</span>
        </span>
        {isCanceled && (
          <span className="text-[10px] text-rose-500 font-semibold">구독 취소됨</span>
        )}
        {!isCanceled && expiresAt && (
          <span className="text-[10px] text-slate-400 font-normal">
            ~{new Date(expiresAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })} 만료
          </span>
        )}
      </div>
    );
  };

  // Plan stats count
  const planCounts = academies.reduce(
    (acc, a) => {
      const t = a.subscription?.tier ?? 'FREE';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    },
    { FREE: 0, PRO: 0, ENTERPRISE: 0 } as Record<PlanTier, number>,
  );

  const filteredAcademies = academies.filter((academy) => {
    const matchesSearch =
      academy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (academy.owner?.name && academy.owner.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (academy.owner?.email && academy.owner.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (academy.phoneNumber && academy.phoneNumber.includes(searchTerm)) ||
      (academy.address && academy.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ? true : academy.status === statusFilter;

    const academyTier = academy.subscription?.tier ?? 'FREE';
    const matchesPlan =
      planFilter === 'ALL' ? true : academyTier === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const filteredDailyStats = (visitorSummary?.dailyStats ?? [])
    .filter((stat) => {
      if (!visitorSearchTerm) return true;
      return stat.date.includes(visitorSearchTerm);
    })
    .sort((a, b) => {
      if (visitorSortOrder === 'desc') {
        return b.date.localeCompare(a.date);
      }
      return a.date.localeCompare(b.date);
    });

  const getTabHeader = () => {
    switch (activeTab) {
      case 'visitors':
        return {
          badge: 'Platform Traffic & Growth Analytics',
          title: '사이트 방문자 & 플랫폼 성장 분석',
          desc: '날짜별 순 방문자(비로그인 UV + 교직원 로그인), 신규 가입자 및 신규 개설 학원 실시간 통계를 집계합니다.',
          icon: Users,
        };
      case 'academies':
        return {
          badge: 'Tenants & Academies',
          title: '입점 학원 통합 관리',
          desc: 'ClassHelper에 등록된 모든 학원의 상세 상태, 원생/교직원 규모 및 운영 권한을 통합 관리합니다.',
          icon: Building2,
        };
      case 'subscriptions':
        return {
          badge: 'SaaS Billing & Subscriptions',
          title: '구독 요금제 & 플랜 제어',
          desc: '학원별 요금제 등급(FREE / PRO / ENTERPRISE), 구독 상태 및 만료일을 제어합니다.',
          icon: CreditCard,
        };
      case 'audit-logs':
        return {
          badge: 'Governance & Security Audit',
          title: '관리자 감사 로그',
          desc: '플랫폼 관리자의 주요 정책 변경, 테넌트 상태 수정 및 시스템 작업 이력을 열람합니다.',
          icon: FileText,
        };
      case 'system':
        return {
          badge: 'Infrastructure & Database',
          title: '시스템 & 인프라 모니터링',
          desc: 'PostgreSQL 멀티테넌트 데이터베이스, 자동 백업 주기 및 엔진 가동 상태를 점검합니다.',
          icon: ShieldCheck,
        };
      case 'overview':
      default:
        return {
          badge: 'Platform Root Governance',
          title: '종합 관제 대시보드',
          desc: '입점 학원 모니터링, 실시간 운영 현황, 요금제 점유율 및 플랫폼 핵심 지표를 종합 관제합니다.',
          icon: Activity,
        };
    }
  };

  const currentHeader = getTabHeader();
  const HeaderIcon = currentHeader.icon;

  if (!isHydrated || !isAuthenticated || user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <AppLayout currentPath="/admin" currentTab={activeTab}>
      <main className="flex-1 relative overflow-hidden py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-7">
          {/* Header Title */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase tracking-wide">
                  {currentHeader.badge}
                </span>
                <span className="text-xs text-slate-400">ClassHelper SaaS 관리자 포털</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5 mt-1">
                <HeaderIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                <span>{currentHeader.title}</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {currentHeader.desc}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'visitors') {
                    loadVisitorData();
                  } else {
                    loadAdminData();
                  }
                }}
                disabled={isLoading || isLoadingVisitors}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isLoadingVisitors ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: 종합 관제 대시보드 (OVERVIEW) */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-7 animate-in fade-in duration-200">
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      총 입점 학원 & 요금제
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {stats?.academies.total ?? academies.length}
                      </span>
                      <span className="text-xs text-slate-400">개 학원</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        Free {planCounts.FREE}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold">
                        Pro {planCounts.PRO}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-semibold">
                        Ent {planCounts.ENTERPRISE}
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      전체 관리 원생
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {stats?.students.total ?? 0}
                      </span>
                      <span className="text-xs text-slate-400">명</span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      정규 재원생:{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {stats?.students.active ?? 0}명
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      전체 개설 수업 반
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {stats?.classes.total ?? 0}
                      </span>
                      <span className="text-xs text-slate-400">개 반</span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      등록 강사/직원:{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {stats?.users.total ?? 0}명
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      오늘 출결 & 알림톡
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {stats?.todayAttendances ?? 0}
                      </span>
                      <span className="text-xs text-slate-400">건 출결</span>
                    </div>
                    <div className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>카카오 알림톡 자동 연동</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <CalendarCheck2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Plan Distribution Visual */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      SaaS 요금제 플랜 점유율
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      전체 입점 학원 중 유료 플랜 전환율 및 등급 분포
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                    유료 전환율:{' '}
                    {academies.length > 0
                      ? Math.round(
                          ((planCounts.PRO + planCounts.ENTERPRISE) / academies.length) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>

                {/* Multi-color Bar */}
                <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${
                        academies.length > 0
                          ? (planCounts.FREE / academies.length) * 100
                          : 100
                      }%`,
                    }}
                    className="bg-slate-400 dark:bg-slate-600 transition-all duration-500"
                    title={`Free 플랜: ${planCounts.FREE}개`}
                  />
                  <div
                    style={{
                      width: `${
                        academies.length > 0
                          ? (planCounts.PRO / academies.length) * 100
                          : 0
                      }%`,
                    }}
                    className="bg-indigo-500 transition-all duration-500"
                    title={`Pro 플랜: ${planCounts.PRO}개`}
                  />
                  <div
                    style={{
                      width: `${
                        academies.length > 0
                          ? (planCounts.ENTERPRISE / academies.length) * 100
                          : 0
                      }%`,
                    }}
                    className="bg-purple-600 transition-all duration-500"
                    title={`Enterprise 플랜: ${planCounts.ENTERPRISE}개`}
                  />
                </div>

                {/* Plan Legend */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                      <span>FREE 플랜</span>
                    </div>
                    <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                      {planCounts.FREE}
                      <span className="text-xs font-normal text-slate-400 ml-1">학원</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">기본 30명 한도</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span>PRO 플랜</span>
                    </div>
                    <div className="mt-1 text-lg font-black text-indigo-950 dark:text-indigo-200">
                      {planCounts.PRO}
                      <span className="text-xs font-normal text-indigo-400 ml-1">학원</span>
                    </div>
                    <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">
                      무제한 원생 & 출결
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40">
                    <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                      <span>ENTERPRISE</span>
                    </div>
                    <div className="mt-1 text-lg font-black text-purple-950 dark:text-purple-200">
                      {planCounts.ENTERPRISE}
                      <span className="text-xs font-normal text-purple-400 ml-1">학원</span>
                    </div>
                    <p className="text-[11px] text-purple-600/80 dark:text-purple-400/80 mt-0.5">
                      다지점 본원/분원
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Academies Table Preview */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span>입점 학원 개요 (최근 등록순)</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      자세한 검색 및 조작은 좌측 사이드바의 &apos;입점 학원 통합 관리&apos; 메뉴에서 수행할 수 있습니다.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    최근 5개 학원 표시
                  </span>
                </div>

                <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                        <th className="py-3 px-4">학원명 / ID</th>
                        <th className="py-3 px-4">원장님 정보</th>
                        <th className="py-3 px-4">규모 (원생 / 반 / 교직원)</th>
                        <th className="py-3 px-4">요금제</th>
                        <th className="py-3 px-4">운영 상태</th>
                        <th className="py-3 px-4 text-right">상세 분석</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {academies.slice(0, 5).map((academy) => (
                        <tr
                          key={academy.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {academy.name}
                            </div>
                            <div className="text-[11px] text-slate-400">ID: #{academy.id}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {academy.owner?.name || '미등록'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {academy.owner?.phone || academy.phoneNumber || '연락처 없음'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {academy.stats.studentCount}명
                            </span>{' '}
                            / {academy.stats.classCount}개 반 / {academy.stats.staffCount}명 직원
                          </td>
                          <td className="py-3 px-4">
                            {getTierBadge(
                              academy.subscription?.tier,
                              academy.subscription?.status,
                              academy.subscription?.expiresAt,
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                academy.status === 'ACTIVE'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  academy.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span>{academy.status === 'ACTIVE' ? '정상 운영' : '일시 정지'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenAcademyDetail(academy.id)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Search className="w-3.5 h-3.5" />
                              <span>분석</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: 사이트 방문자 분석 (VISITORS) */}
          {/* ========================================================================= */}
          {activeTab === 'visitors' && (
            <div className="space-y-7 animate-in fade-in duration-200">
              {/* 1. Filter Bar & Controls */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">
                    조회 기간:
                  </span>
                  {(
                    [
                      { key: '7d', label: '최근 7일' },
                      { key: '14d', label: '최근 14일' },
                      { key: '30d', label: '최근 30일' },
                      { key: 'custom', label: '직접 지정' },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        setVisitorDatePreset(preset.key);
                        if (preset.key !== 'custom') {
                          loadVisitorData(preset.key);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        visitorDatePreset === preset.key
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}

                  {visitorDatePreset === 'custom' && (
                    <div className="flex items-center gap-2 ml-1">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                      <span className="text-slate-400 text-xs">~</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => loadVisitorData('custom', customStartDate, customEndDate)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
                      >
                        조회
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={handleDownloadVisitorCsv}
                    disabled={!visitorSummary?.dailyStats.length}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV 내보내기</span>
                  </button>
                </div>
              </div>

              {/* 2. Key Metrics 4 Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* Total UV */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      기간 순 방문자 (UV)
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {isLoadingVisitors ? '...' : (visitorSummary?.totalVisitors ?? 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">명</span>
                    </div>
                    <div className="mt-2 text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                      오늘 방문: {visitorSummary?.todayVisitors ?? 0}명 (비로그인 {visitorSummary?.dailyStats.find(d => d.date === new Date().toISOString().slice(0, 10))?.anonymousVisitors ?? 0} + 로그인 {visitorSummary?.todayLogins ?? 0})
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* Logged in staff */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      로그인 교직원 (누적)
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {isLoadingVisitors ? '...' : (visitorSummary?.totalLogins ?? 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">명</span>
                    </div>
                    <div className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      오늘 로그인: {visitorSummary?.todayLogins ?? 0}명 (고유 사용자)
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                </div>

                {/* New Signups */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      신규 가입 교직원
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {isLoadingVisitors ? '...' : (visitorSummary?.totalNewSignups ?? 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">명</span>
                    </div>
                    <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      오늘 신규 가입: +{visitorSummary?.todayNewSignups ?? 0}명
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>

                {/* New Academies */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      신규 개설 학원
                    </span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                        {isLoadingVisitors ? '...' : (visitorSummary?.totalNewAcademies ?? 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">개 학원</span>
                    </div>
                    <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                      오늘 신규 개설: +{visitorSummary?.todayNewAcademies ?? 0}개
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* 3. Daily Visitor Trend Interactive Chart */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span>날짜별 일일 방문자 및 성장 추이 (UV)</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      막대를 클릭하면 해당 날짜의 비로그인 방문자, 교직원 로그인, 신규 가입 및 학원 개설 세부 현황을 확인할 수 있습니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-purple-600" />
                      <span>비로그인 방문 (UV)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-indigo-500" />
                      <span>교직원 로그인</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>신규 가입</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>신규 학원</span>
                    </div>
                  </div>
                </div>

                {isLoadingVisitors ? (
                  <div className="h-64 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : !visitorSummary?.dailyStats.length ? (
                  <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                    표시할 방문 통계 데이터가 없습니다.
                  </div>
                ) : (
                  <div className="pt-4">
                    {/* Chart Bars */}
                    <div className="h-56 flex items-end gap-2 sm:gap-3 overflow-x-auto pb-2 px-1">
                      {visitorSummary.dailyStats.map((item) => {
                        const totalUV = item.anonymousVisitors + item.loginCount;
                        const maxVal = Math.max(
                          ...(visitorSummary.dailyStats.map((d) => d.anonymousVisitors + d.loginCount) || [10]),
                          10
                        );
                        const heightPct = totalUV > 0 ? Math.max(14, Math.round((totalUV / maxVal) * 100)) : 6;
                        const isSelected = selectedVisitorDate?.date === item.date;
                        const dateObj = new Date(item.date);
                        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                        const dayName = isNaN(dateObj.getTime()) ? '' : dayNames[dateObj.getDay()];
                        const isWeekend = dayName === '토' || dayName === '일';

                        const anonPct = totalUV > 0 ? Math.round((item.anonymousVisitors / totalUV) * 100) : 50;

                        return (
                          <div
                            key={item.date}
                            onClick={() => setSelectedVisitorDate(item)}
                            className="flex-1 min-w-[36px] sm:min-w-[48px] flex flex-col items-center gap-1.5 group cursor-pointer"
                          >
                            {/* Visitor Count or Indicator Badge */}
                            <div className="h-4 flex items-center justify-center">
                              {item.newAcademies > 0 ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                  +{item.newAcademies}원
                                </span>
                              ) : item.newSignups > 0 ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  +{item.newSignups}인
                                </span>
                              ) : (
                                <span
                                  className={`text-[10px] font-extrabold transition-colors ${
                                    isSelected
                                      ? 'text-purple-600 dark:text-purple-400'
                                      : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                                  }`}
                                >
                                  {totalUV}
                                </span>
                              )}
                            </div>

                            {/* Stacked Bar Container */}
                            <div className="w-full flex items-end justify-center h-40 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-1 relative overflow-hidden">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full rounded-lg flex flex-col justify-end overflow-hidden transition-all duration-300 ${
                                  isSelected
                                    ? 'ring-2 ring-purple-600 shadow-md shadow-purple-500/20'
                                    : 'group-hover:opacity-90'
                                }`}
                              >
                                {/* Top: Anonymous */}
                                <div
                                  style={{ height: `${anonPct}%` }}
                                  className="w-full bg-purple-600 transition-all"
                                  title={`비로그인 방문: ${item.anonymousVisitors}명`}
                                />
                                {/* Bottom: Logged in */}
                                <div
                                  style={{ height: `${100 - anonPct}%` }}
                                  className="w-full bg-indigo-500 transition-all"
                                  title={`교직원 로그인: ${item.loginCount}명`}
                                />
                              </div>
                            </div>

                            {/* Date Label */}
                            <div className="text-center">
                              <div
                                className={`text-[11px] font-bold ${
                                  isSelected
                                    ? 'text-purple-600 dark:text-purple-400'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {item.date.slice(5)}
                              </div>
                              <div
                                className={`text-[10px] ${
                                  isWeekend
                                    ? 'text-rose-500 font-semibold'
                                    : 'text-slate-400'
                                }`}
                              >
                                {dayName}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Date Detail Banner */}
                    {selectedVisitorDate && (
                      <div className="mt-4 p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {selectedVisitorDate.date} 상세 분석
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-600 dark:text-slate-300">
                            총 순방문 <strong className="text-purple-600 dark:text-purple-400">{selectedVisitorDate.anonymousVisitors + selectedVisitorDate.loginCount}</strong>명
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">
                            비로그인 <strong className="text-purple-500">{selectedVisitorDate.anonymousVisitors}</strong>명
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">
                            교직원 로그인 <strong className="text-indigo-600 dark:text-indigo-400">{selectedVisitorDate.loginCount}</strong>명
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] flex-wrap">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            신규 가입 +{selectedVisitorDate.newSignups}명
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            신규 학원 +{selectedVisitorDate.newAcademies}개원
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Detailed Daily Visitors Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CalendarCheck2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span>날짜별 방문 & 성장 기록 목록</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      ClassHelper SaaS 플랫폼의 일자별 순 방문자, 교직원 로그인, 신규 가입자 및 학원 개설 현황을 실시간 집계합니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="날짜 검색 (예: 2026-09)..."
                        value={visitorSearchTerm}
                        onChange={(e) => setVisitorSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setVisitorSortOrder(visitorSortOrder === 'desc' ? 'asc' : 'desc')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                    >
                      {visitorSortOrder === 'desc' ? (
                        <>
                          <ArrowDown className="w-3 h-3 text-purple-600" />
                          <span>최신순</span>
                        </>
                      ) : (
                        <>
                          <ArrowUp className="w-3 h-3 text-purple-600" />
                          <span>과거순</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                        <th className="py-3 px-4">방문 일자</th>
                        <th className="py-3 px-4">총 순방문 (UV)</th>
                        <th className="py-3 px-4">비로그인 방문</th>
                        <th className="py-3 px-4">로그인 교직원</th>
                        <th className="py-3 px-4">신규 가입 교직원</th>
                        <th className="py-3 px-4">신규 개설 학원</th>
                        <th className="py-3 px-4 text-right">일일 성장 지표</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredDailyStats.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            해당 조건의 일일 방문 기록이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredDailyStats.map((stat) => {
                          const dateObj = new Date(stat.date);
                          const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                          const dayName = isNaN(dateObj.getTime()) ? '' : dayNames[dateObj.getDay()];
                          const isWeekend = dayName === '토' || dayName === '일';
                          const totalUV = stat.anonymousVisitors + stat.loginCount;

                          return (
                            <tr
                              key={stat.date}
                              className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                                selectedVisitorDate?.date === stat.date ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{stat.date}</span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                      isWeekend
                                        ? 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {dayName}요일
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                  {totalUV.toLocaleString()}
                                </span>
                                <span className="text-[11px] text-slate-400 ml-1">명</span>
                              </td>

                              <td className="py-3 px-4">
                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                  {stat.anonymousVisitors.toLocaleString()}
                                </span>
                                <span className="text-[11px] text-slate-400 ml-1">명</span>
                              </td>

                              <td className="py-3 px-4">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                  {stat.loginCount.toLocaleString()}
                                </span>
                                <span className="text-[11px] text-slate-400 ml-1">명</span>
                              </td>

                              <td className="py-3 px-4">
                                {stat.newSignups > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <Sparkles className="w-3 h-3 text-emerald-500" />
                                    <span>+{stat.newSignups}명</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                              </td>

                              <td className="py-3 px-4">
                                {stat.newAcademies > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    <Building2 className="w-3 h-3 text-amber-500" />
                                    <span>+{stat.newAcademies}개원</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right">
                                {stat.newAcademies > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                                    신규 학원 입점
                                  </span>
                                ) : stat.newSignups > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                                    교직원 신규 유입
                                  </span>
                                ) : stat.loginCount > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                    학사 운영 활성
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    일반 방문
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 입점 학원 통합 관리 (ACADEMIES) */}
          {/* ========================================================================= */}
          {activeTab === 'academies' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden">
                {/* Table Header & Controls */}
                <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span>입점 학원 목록 및 세부 제어 ({filteredAcademies.length}개)</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      학원별 원생/반/교직원 현황 파악, 운영 상태 변경, 플랜 설정 및 세부 분석 모달을 제공합니다.
                    </p>
                  </div>

                  {/* Filters & Search */}
                  <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3">
                    {/* Plan Filter Tabs */}
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setPlanFilter('ALL')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          planFilter === 'ALL'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        플랜 전체
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanFilter('FREE')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          planFilter === 'FREE'
                            ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Free ({planCounts.FREE})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanFilter('PRO')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          planFilter === 'PRO'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Pro ({planCounts.PRO})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanFilter('ENTERPRISE')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          planFilter === 'ENTERPRISE'
                            ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Ent ({planCounts.ENTERPRISE})
                      </button>
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          statusFilter === 'ALL'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        상태 전체
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ACTIVE')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          statusFilter === 'ACTIVE'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        정상 운영
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('SUSPENDED')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          statusFilter === 'SUSPENDED'
                            ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        일시 정지
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="학원명, 원장, 연락처, 주소 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                        <th className="py-3 px-4">학원 기본 정보</th>
                        <th className="py-3 px-4">원장님 정보</th>
                        <th className="py-3 px-4">운영 규모 (원생/반/직원)</th>
                        <th className="py-3 px-4 text-center">요금제 플랜</th>
                        <th className="py-3 px-4 text-center">운영 상태</th>
                        <th className="py-3 px-4 text-right">상세 분석 & 액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {filteredAcademies.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            검색 조건과 일치하는 입점 학원이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredAcademies.map((academy) => (
                          <tr
                            key={academy.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mt-0.5">
                                  #{academy.id}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                                    {academy.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {academy.address || '주소 미등록'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    사업자: {academy.businessNumber || '미등록'} • 대표전화:{' '}
                                    {academy.phoneNumber || '미등록'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              {academy.owner ? (
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white">
                                    {academy.owner.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {academy.owner.email}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {academy.owner.phone || '연락처 없음'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">원장 계정 미등록</span>
                              )}
                            </td>

                            <td className="py-4 px-4">
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  원생: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{academy.stats.studentCount}명</span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  수업 반: {academy.stats.classCount}개 • 교직원: {academy.stats.staffCount}명
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center">
                              {getTierBadge(
                                academy.subscription?.tier,
                                academy.subscription?.status,
                                academy.subscription?.expiresAt,
                              )}
                            </td>

                            <td className="py-4 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  academy.status === 'ACTIVE'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    academy.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                                <span>{academy.status === 'ACTIVE' ? '정상 운영' : '일시 정지'}</span>
                              </span>
                            </td>

                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* 1. Detailed Analysis Modal */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenAcademyDetail(academy.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                                  title="학원 세부 분석 및 교직원 명단 조회"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                  <span>상세 분석</span>
                                </button>

                                {/* 2. Edit Plan */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenSubscriptionModal(academy)}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                                  title="요금제 및 구독 기간 변경"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>플랜 변경</span>
                                </button>

                                {/* 3. Toggle Status */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleAcademyStatus(academy)}
                                  disabled={actionLoadingId === academy.id}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50 ${
                                    academy.status === 'ACTIVE'
                                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900'
                                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900'
                                  }`}
                                  title={academy.status === 'ACTIVE' ? '학원 일시 정지' : '정상 운영 재개'}
                                >
                                  {actionLoadingId === academy.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : academy.status === 'ACTIVE' ? (
                                    <>
                                      <PauseCircle className="w-3.5 h-3.5" />
                                      <span>정지</span>
                                    </>
                                  ) : (
                                    <>
                                      <PlayCircle className="w-3.5 h-3.5" />
                                      <span>재개</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: 구독 & 요금제 관리 (SUBSCRIPTIONS) */}
          {/* ========================================================================= */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* 3 Tier Specification Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      FREE 플랜
                    </span>
                    <span className="text-xs font-extrabold text-slate-400">
                      {planCounts.FREE}개 학원 이용 중
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">기본 무료 체험</h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>원생 수 최대 30명 한도</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>1초 출결 체크 및 기본 반 개설</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>수강료 수납 관리 기본 기능</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-md space-y-3 relative overflow-hidden">
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-extrabold shadow-2xs">
                    POPULAR
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      PRO 플랜
                    </span>
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                      {planCounts.PRO}개 학원 이용 중
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-indigo-950 dark:text-indigo-200">성장형 정규 학원</h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>원생 수 최대 150명 확장</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>카카오 알림톡 실시간 발송 무제한</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>학생 개별 정밀 리포트 및 과제 검사</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-slate-900 border border-purple-200 dark:border-purple-800 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                      ENTERPRISE
                    </span>
                    <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">
                      {planCounts.ENTERPRISE}개 학원 이용 중
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-purple-950 dark:text-purple-200">대형 및 다지점 어학원</h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>원생 및 반 등록 완전 무제한</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>본원/분원 다지점 통합 거버넌스</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>전담 기술 지원 및 맞춤형 커스텀</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Subscriptions Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span>학원별 구독 및 만료일 관리</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      각 학원의 플랜 등급(Tier), 구독 상태, 만료일자 및 관리자 메모를 관리합니다.
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                        <th className="py-3 px-4">학원명 / ID</th>
                        <th className="py-3 px-4">원장님 정보</th>
                        <th className="py-3 px-4">현재 플랜 등급</th>
                        <th className="py-3 px-4">구독 상태</th>
                        <th className="py-3 px-4">만료 예정일</th>
                        <th className="py-3 px-4">관리자 메모</th>
                        <th className="py-3 px-4 text-right">플랜 변경</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {academies.map((academy) => {
                        const sub = academy.subscription;
                        return (
                          <tr
                            key={academy.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              <div>{academy.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                #{academy.id} • 원생 {academy.stats.studentCount}명
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {academy.owner?.name || '미등록'}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {academy.owner?.email || '-'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {getTierBadge(sub?.tier, sub?.status, null)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sub?.status === 'ACTIVE'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                }`}
                              >
                                {sub?.status === 'ACTIVE' ? '정상 활성' : '구독 취소'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                              {sub?.expiresAt ? (
                                <span className="font-semibold">
                                  {new Date(sub.expiresAt).toLocaleDateString('ko-KR')}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">무기한 (제한 없음)</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                              {sub?.notes || '-'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenSubscriptionModal(academy)}
                                className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>변경</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: 관리자 감사 로그 (AUDIT-LOGS) */}
          {/* ========================================================================= */}
          {activeTab === 'audit-logs' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span>플랫폼 관리자 조작 감사 로그 (Audit Trail)</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      학원 상태 변경, 요금제 승급/강등, 시스템 초기화 등 관리자가 수행한 모든 중요 작업 내역입니다.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 self-start sm:self-auto">
                    최근 {auditLogs.length}건 기록 보관
                  </span>
                </div>

                <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                        <th className="py-3 px-4">발생 일시</th>
                        <th className="py-3 px-4">작업 관리자</th>
                        <th className="py-3 px-4">작업 유형 (Action)</th>
                        <th className="py-3 px-4">대상 (Target)</th>
                        <th className="py-3 px-4">상세 변경 내용 및 사유</th>
                        <th className="py-3 px-4 text-right">접속 IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            아직 기록된 관리자 작업 감사 로그가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {log.adminName}
                              </span>
                              <span className="text-[11px] text-slate-400 block">
                                {log.adminEmail}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                  log.action.includes('STATUS')
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    : log.action.includes('SUBSCRIPTION')
                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {log.targetType}
                              </span>
                              {log.targetId && (
                                <span className="text-slate-400 ml-1">#{log.targetId}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-sm">
                              {log.details?.reason ? (
                                <span>{log.details.reason}</span>
                              ) : log.details?.message ? (
                                <span>{log.details.message}</span>
                              ) : (
                                <span className="font-mono text-[11px] text-slate-400">
                                  {JSON.stringify(log.details)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                              {log.ipAddress || '127.0.0.1'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: 시스템 & 인프라 현황 (SYSTEM) */}
          {/* ========================================================================= */}
          {activeTab === 'system' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Infrastructure Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. Backend API Health */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Server className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>200 OK 정상</span>
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      백엔드 REST API 서버
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      NestJS v11 • 포트 3000
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div>• CORS 허용: 3000, 3001, 5000</div>
                    <div>• 인증 체계: JWT + RTR (15m/7d)</div>
                    <div>• API Docs: Swagger /api-docs 연동</div>
                  </div>
                </div>

                {/* 2. Frontend App Health */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Activity className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      <span>정상 서비스 중</span>
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      프론트엔드 웹 애플리케이션
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Next.js 16 (App Router) • 포트 5000
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div>• UI/스타일: Tailwind CSS v4</div>
                    <div>• 상태 관리: Zustand + TanStack Query v5</div>
                    <div>• 라우트 분리: SUPER_ADMIN 전용 관제 가드 탑재</div>
                  </div>
                </div>

                {/* 3. Database Multi-Tenancy */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      <span>Prisma 7 연동</span>
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      PostgreSQL 16 DB (격리 모델)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      멀티테넌시(Multi-Tenancy) 스키마
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div>• 테넌트 격리: academyId 강제 스코프</div>
                    <div>• 커넥션 풀: @prisma/adapter-pg 사용</div>
                    <div>• 플랫폼 관리자: academyId null 분리 관제</div>
                  </div>
                </div>
              </div>

              {/* CI/CD & Cloud Backup Architecture Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>배포 파이프라인 및 백업 인프라 아키텍처</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ClassHelper의 무중단 배포(CD) 및 데이터 보호(S3 Backup) 운영 스펙입니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>GitHub Actions CI/CD + Watchtower 자동 배포</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      `dev` 브랜치에 코드가 푸시되면 CI 게이트(린트/테스트/빌드) 검증을 통과한 후,
                      GHCR(Private)에 Docker 이미지가 푸시됩니다. EC2의 Watchtower가 60초 간격으로
                      새 이미지를 감지하여 컨테이너를 무중단 자동 갱신합니다.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>AWS S3 데이터베이스 일일 자동 백업</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      매일 새벽 03:00 KST(18:00 UTC)에 EC2 호스트에서 PostgreSQL 덤프를 실행하고
                      gzip 압축하여 AWS S3 전용 백업 버킷에 자동 업로드합니다. 백업본은 30일 보관
                      수명주기 정책이 적용되어 안전하게 관리됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. [NEW] 학원 상세 분석 모달 (ACADEMY DETAIL MODAL) */}
      {/* ========================================================================= */}
      {selectedAcademyIdForDetail !== null && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAcademyIdForDetail(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs">
                  #{selectedAcademyIdForDetail}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {academyDetail?.name || '학원 상세 정보'}
                    </h3>
                    {academyDetail && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          academyDetail.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {academyDetail.status === 'ACTIVE' ? '정상 운영' : '일시 정지'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    학원 운영 규모, 소속 교직원 명단 및 구독 현황 분석
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAcademyIdForDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {isLoadingDetail ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span>학원 세부 정보를 조회하는 중입니다...</span>
                </div>
              ) : academyDetail ? (
                <>
                  {/* 4 Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-center">
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                        재원생 수
                      </span>
                      <div className="text-xl font-black text-indigo-950 dark:text-indigo-200 mt-1">
                        {academyDetail._count?.students ?? 0}
                        <span className="text-xs font-normal text-indigo-400 ml-1">명</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 text-center">
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                        개설 수업 반
                      </span>
                      <div className="text-xl font-black text-amber-950 dark:text-amber-200 mt-1">
                        {academyDetail._count?.classes ?? 0}
                        <span className="text-xs font-normal text-amber-400 ml-1">개</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-center">
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                        누적 출결 기록
                      </span>
                      <div className="text-xl font-black text-emerald-950 dark:text-emerald-200 mt-1">
                        {academyDetail._count?.attendances ?? 0}
                        <span className="text-xs font-normal text-emerald-400 ml-1">건</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 text-center">
                      <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                        수강료 청구서
                      </span>
                      <div className="text-xl font-black text-purple-950 dark:text-purple-200 mt-1">
                        {academyDetail._count?.tuitionInvoices ?? 0}
                        <span className="text-xs font-normal text-purple-400 ml-1">건</span>
                      </div>
                    </div>
                  </div>

                  {/* Academy Profile Details */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>학원 기본 프로필</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>대표 전화: {academyDetail.phoneNumber || '미등록'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>사업자번호: {academyDetail.businessNumber || '미등록'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 sm:col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>도로명 주소: {academyDetail.address || '주소 정보 미등록'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 sm:col-span-2 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          등록 일자: {new Date(academyDetail.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Staff List */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>소속 교직원 및 강사 명단 ({academyDetail.users?.length ?? 0}명)</span>
                    </h4>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                            <th className="py-2.5 px-3">성명</th>
                            <th className="py-2.5 px-3">직책 (Role)</th>
                            <th className="py-2.5 px-3">이메일 계정</th>
                            <th className="py-2.5 px-3">연락처</th>
                            <th className="py-2.5 px-3 text-right">가입일</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {academyDetail.users?.map((u: any) => (
                            <tr
                              key={u.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                            >
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                {u.name}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    u.role === 'OWNER'
                                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                                      : u.role === 'ADMIN'
                                      ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                                      : u.role === 'TEACHER'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {u.role === 'OWNER'
                                    ? '원장'
                                    : u.role === 'ADMIN'
                                    ? '부원장'
                                    : u.role === 'TEACHER'
                                    ? '강사'
                                    : '스태프'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                {u.email}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {u.phone || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                                {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Current Subscription Status */}
                  <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold block">
                        현재 요금제 플랜
                      </span>
                      <div className="text-base font-extrabold text-purple-950 dark:text-purple-200 mt-0.5">
                        {academyDetail.subscription?.tier || 'FREE'} 플랜
                        <span className="text-xs font-normal text-purple-600 dark:text-purple-400 ml-2">
                          ({academyDetail.subscription?.status === 'ACTIVE' ? '구독 정상' : '구독 취소'})
                        </span>
                      </div>
                      {academyDetail.subscription?.expiresAt && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          만료 예정일: {new Date(academyDetail.subscription.expiresAt).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const target = academies.find((a) => a.id === selectedAcademyIdForDetail);
                        if (target) {
                          setSelectedAcademyIdForDetail(null);
                          handleOpenSubscriptionModal(target);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      플랜 변경하기
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              {academyDetail && (
                <button
                  type="button"
                  onClick={() => {
                    const target = academies.find((a) => a.id === selectedAcademyIdForDetail);
                    if (target) handleToggleAcademyStatus(target);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    academyDetail.status === 'ACTIVE'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                  }`}
                >
                  {academyDetail.status === 'ACTIVE' ? (
                    <>
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>이 학원 일시 정지</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>정상 운영 복구</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedAcademyIdForDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer ml-auto"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. 구독 요금제 수정 모달 (SUBSCRIPTION EDIT MODAL) */}
      {/* ========================================================================= */}
      {editingAcademy && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseSubscriptionModal();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold border border-purple-200 dark:border-purple-800/80">
                  <CreditCard className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>요금제 구독 등급 설정</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                      {editingAcademy.name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    학원의 플랜 등급(Tier), 상태 및 이용 만료일을 수동으로 지정합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseSubscriptionModal}
                disabled={isSavingSubscription}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveSubscription} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* 1. Select Tier Cards */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>요금제 등급 선택 (Plan Tier)</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* FREE Card */}
                  <button
                    type="button"
                    onClick={() => setModalTier('FREE')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      modalTier === 'FREE'
                        ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 dark:border-slate-400 ring-2 ring-slate-400/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Sparkles className="w-4 h-4 text-slate-500" />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        기본
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="font-bold text-slate-900 dark:text-white">FREE</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">원생 30명 한도</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">기본 학사 운영</div>
                    </div>
                  </button>

                  {/* PRO Card */}
                  <button
                    type="button"
                    onClick={() => setModalTier('PRO')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      modalTier === 'PRO'
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 dark:border-indigo-400 ring-2 ring-indigo-500/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        추천
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="font-bold text-indigo-900 dark:text-indigo-200">PRO</div>
                      <div className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                        원생 무제한
                      </div>
                      <div className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-0.5">
                        모든 기능 해제
                      </div>
                    </div>
                  </button>

                  {/* ENTERPRISE Card */}
                  <button
                    type="button"
                    onClick={() => setModalTier('ENTERPRISE')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      modalTier === 'ENTERPRISE'
                        ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/60 dark:border-purple-400 ring-2 ring-purple-500/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                        VIP
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="font-bold text-purple-900 dark:text-purple-200">ENTERPRISE</div>
                      <div className="text-[10px] text-purple-700/80 dark:text-purple-300/80 mt-0.5">
                        무제한 + 다지점
                      </div>
                      <div className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                        본원/분원 통합
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Subscription Status */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  구독 활성화 상태
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalStatus('ACTIVE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalStatus === 'ACTIVE'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>정상 구독 (ACTIVE)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStatus('CANCELED')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      modalStatus === 'CANCELED'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold'
                        : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>구독 취소 (CANCELED)</span>
                  </button>
                </div>
              </div>

              {/* 3. Expiration Date */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    구독 만료일 설정
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUnlimitedExpiry}
                      onChange={(e) => {
                        setIsUnlimitedExpiry(e.target.checked);
                        if (e.target.checked) setModalExpiresAt('');
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>무기한 이용 (만료일 없음)</span>
                  </label>
                </div>
                {!isUnlimitedExpiry && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="date"
                      value={modalExpiresAt}
                      onChange={(e) => setModalExpiresAt(e.target.value)}
                      className="block w-full pl-8.5 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* 4. Notes & Reason */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    관리자 메모 (학원 상세용)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 6개월 프로모션 무료 제공, 신규 오픈 프로모션"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="block w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    변경 사유 (감사 로그 기록용)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 원장님 유료 전환 요청에 따른 수동 업그레이드"
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    className="block w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseSubscriptionModal}
                  disabled={isSavingSubscription}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSavingSubscription}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-all shadow-xs disabled:opacity-50"
                >
                  {isSavingSubscription ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>저장 중...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>요금제 적용</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function AdminPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      }
    >
      <AdminPortalContent />
    </Suspense>
  );
}
