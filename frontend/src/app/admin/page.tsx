'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Clock,
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
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  adminService,
  PlatformStats,
  AdminAcademyItem,
  AdminAuditLogItem,
  UpdateSubscriptionPayload,
} from '@/lib/admin-service';
import { PlanTier, SubscriptionStatus } from '@/types/auth';
import { AppLayout } from '@/components/common/AppLayout';

export default function AdminPortalPage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [academies, setAcademies] = useState<AdminAcademyItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [planFilter, setPlanFilter] = useState<'ALL' | PlanTier>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Subscription Edit Modal State
  const [editingAcademy, setEditingAcademy] = useState<AdminAcademyItem | null>(null);
  const [modalTier, setModalTier] = useState<PlanTier>('FREE');
  const [modalStatus, setModalStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [isUnlimitedExpiry, setIsUnlimitedExpiry] = useState<boolean>(true);
  const [modalExpiresAt, setModalExpiresAt] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalReason, setModalReason] = useState<string>('');
  const [isSavingSubscription, setIsSavingSubscription] = useState<boolean>(false);

  // Authentication & Role verification
  useEffect(() => {
    if (isHydrated) {
      if (!isAuthenticated || !user) {
        router.replace('/login');
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
        adminService.getAuditLogs(20).catch(() => []),
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
    }
  }, [isAuthenticated, user]);

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
            isCanceled ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-300 dark:border-slate-700 line-through' : tierConfig.color
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
      (academy.phoneNumber && academy.phoneNumber.includes(searchTerm));

    const matchesStatus =
      statusFilter === 'ALL' ? true : academy.status === statusFilter;

    const academyTier = academy.subscription?.tier ?? 'FREE';
    const matchesPlan =
      planFilter === 'ALL' ? true : academyTier === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (!isHydrated || !isAuthenticated || user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <AppLayout currentPath="/admin">
      {/* Main Body Section */}
      <main className="flex-1 relative overflow-hidden py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
          {/* Header Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                <Shield className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                <span>전체 학원 통합 관리 포털</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                입점 학원 모니터링, 요금제 구독(Plan Tier) 제어 및 플랫폼 주요 지표를 총괄 관리합니다.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAdminData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
          </div>

          {/* 1. Platform Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Stat 1: Total Academies & Plan breakdown */}
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

            {/* Stat 2: Total Students */}
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
                  정규 재원생: <span className="font-semibold text-slate-700 dark:text-slate-300">{stats?.students.active ?? 0}명</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 3: Total Classes */}
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
                  등록 강사/직원: <span className="font-semibold text-slate-700 dark:text-slate-300">{stats?.users.total ?? 0}명</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 4: Today Attendance & Alimtalk */}
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

          {/* 2. Academy Management Table Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden">
            {/* Table Header & Controls */}
            <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>입점 학원 목록 및 요금제/운영 제어</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  학원별 원생/반 현황, 요금제 등급(Free/Pro/Enterprise)을 설정하고 계정 상태를 제어합니다.
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
                    전체 상태
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
                    정상 ({academies.filter((a) => a.status === 'ACTIVE').length})
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
                    정지 ({academies.filter((a) => a.status === 'SUSPENDED').length})
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="학원명, 원장님, 연락처 검색"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-3.5 px-4 sm:px-6">학원 정보</th>
                    <th className="py-3.5 px-4">대표 원장님</th>
                    <th className="py-3.5 px-4 text-center">원생 / 개설반</th>
                    <th className="py-3.5 px-4 text-center">요금제 (Plan)</th>
                    <th className="py-3.5 px-4 text-center">운영 상태</th>
                    <th className="py-3.5 px-4">가입 일자</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">관리 제어</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredAcademies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        검색 조건에 일치하는 학원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredAcademies.map((academy) => (
                      <tr
                        key={academy.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Academy Info */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            <span>{academy.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>ID: #{academy.id}</span>
                            {academy.phoneNumber && <span>• {academy.phoneNumber}</span>}
                          </div>
                          {academy.address && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">
                              {academy.address}
                            </div>
                          )}
                        </td>

                        {/* Owner Info */}
                        <td className="py-4 px-4">
                          {academy.owner ? (
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {academy.owner.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {academy.owner.email}
                              </div>
                              {academy.owner.phone && (
                                <div className="text-[11px] text-slate-400">
                                  {academy.owner.phone}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">원장 계정 없음</span>
                          )}
                        </td>

                        {/* Stats */}
                        <td className="py-4 px-4 text-center">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {academy.stats.studentCount}명
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {academy.stats.classCount}개 반
                          </div>
                        </td>

                        {/* Subscription Plan Tier */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            {getTierBadge(
                              academy.subscription?.tier,
                              academy.subscription?.status,
                              academy.subscription?.expiresAt,
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenSubscriptionModal(academy)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800/80"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              <span>플랜 변경</span>
                            </button>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4 text-center">
                          {academy.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>정상 운영</span>
                            </span>
                          ) : academy.status === 'SUSPENDED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                              <AlertTriangle className="w-3 h-3" />
                              <span>일시 정지</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                              <Clock className="w-3 h-3" />
                              <span>승인 대기</span>
                            </span>
                          )}
                        </td>

                        {/* Registered At */}
                        <td className="py-4 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {new Date(academy.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={actionLoadingId === academy.id}
                              onClick={() => handleToggleAcademyStatus(academy)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                academy.status === 'ACTIVE'
                                  ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}
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
                                  <span>복구</span>
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

          {/* 3. System Audit Log Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-5 sm:p-7">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  최근 플랫폼 관리자 작업 감사 로그
                </h3>
              </div>
              <span className="text-xs text-slate-400">보안 및 변경 이력 추적</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {auditLogs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  최근 기록된 관리자 작업 로그가 없습니다.
                </div>
              ) : (
                auditLogs.map((log) => {
                  const isPlanChange = log.action === 'UPDATE_SUBSCRIPTION_TIER';
                  return (
                    <div
                      key={log.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isPlanChange
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                              : 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {log.adminName}
                        </span>
                        <span className="text-slate-400">
                          (대상: {log.targetType} #{log.targetId || '-'})
                        </span>
                        {log.details?.reason && (
                          <span className="text-slate-500 dark:text-slate-400 italic">
                            &quot;{log.details.reason}&quot;
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                        <span>IP: {log.ipAddress || '127.0.0.1'}</span>
                        <span>•</span>
                        <span>
                          {new Date(log.createdAt).toLocaleString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 4. Subscription Edit Modal */}
      {editingAcademy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    학원 요금제 및 구독 설정
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    [{editingAcademy.name}] (ID: #{editingAcademy.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseSubscriptionModal}
                disabled={isSavingSubscription}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSubscription} className="p-5 sm:p-6 space-y-5 text-xs">
              {/* 1. Plan Tier Selection Cards */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  요금제 등급 선택 (Plan Tier)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* FREE Card */}
                  <button
                    type="button"
                    onClick={() => setModalTier('FREE')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      modalTier === 'FREE'
                        ? 'border-slate-400 bg-slate-100 dark:bg-slate-800 dark:border-slate-500 ring-2 ring-slate-400/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        기본
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="font-bold text-slate-900 dark:text-white">FREE</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        원생 50명 제한
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">단일 학원</div>
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
                      className="block w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="block w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="block w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
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
