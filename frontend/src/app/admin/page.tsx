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
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { adminService, PlatformStats, AdminAcademyItem, AdminAuditLogItem } from '@/lib/admin-service';
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
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

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
        adminService.getAuditLogs(15).catch(() => []),
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

  const filteredAcademies = academies.filter((academy) => {
    const matchesSearch =
      academy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (academy.owner?.name && academy.owner.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (academy.owner?.email && academy.owner.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (academy.phoneNumber && academy.phoneNumber.includes(searchTerm));

    const matchesStatus =
      statusFilter === 'ALL' ? true : academy.status === statusFilter;

    return matchesSearch && matchesStatus;
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                전체 학원 통합 관리 포털
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                입점 학원 모니터링, 계정 운영 상태 제어 및 플랫폼 주요 지표를 총괄 관리합니다.
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
            {/* Stat 1: Total Academies */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  총 입점 학원
                </span>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                    {stats?.academies.total ?? academies.length}
                  </span>
                  <span className="text-xs text-slate-400">개 학원</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    정상 {stats?.academies.active ?? academies.filter((a) => a.status === 'ACTIVE').length}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    정지 {stats?.academies.suspended ?? academies.filter((a) => a.status === 'SUSPENDED').length}
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
            <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>입점 학원 목록 및 운영 제어</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  학원별 원생/반 현황을 확인하고 계정 상태(정상/일시정지)를 즉시 전환할 수 있습니다.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Status Filter Tabs */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    전체 ({academies.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'SUSPENDED'
                        ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    정지 ({academies.filter((a) => a.status === 'SUSPENDED').length})
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
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
                    <th className="py-3.5 px-4 text-center">운영 상태</th>
                    <th className="py-3.5 px-4">가입 일자</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">상태 제어</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredAcademies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
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
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {academy.name}
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
                  최근 관리자 작업 감사 로그
                </h3>
              </div>
              <span className="text-xs text-slate-400">보안 감사 추적용</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {auditLogs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  최근 기록된 관리자 작업 로그가 없습니다.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                        {log.action}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {log.adminName}
                      </span>
                      <span className="text-slate-400">
                        (대상: {log.targetType} #{log.targetId || '-'})
                      </span>
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
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
