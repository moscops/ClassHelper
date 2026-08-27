'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Users,
  BookOpen,
  CalendarCheck2,
  CreditCard,
  LogOut,
  ShieldCheck,
  Building2,
  Key,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Code2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/lib/auth-service';
import { api } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function DashboardPage() {
  const router = useRouter();
  const { user, academy, accessToken, refreshToken, isAuthenticated, isHydrated, logout } =
    useAuthStore();
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);

  // Authentication guard
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

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

  const roleBadge = getRoleBadge(user.role);

  const testGetMe = async () => {
    setIsApiLoading(true);
    setActiveTest('GET /auth/me');
    try {
      const data = await authService.getMe();
      setApiResponse(data);
    } catch (err: any) {
      setApiResponse(err.response?.data || err.message);
    } finally {
      setIsApiLoading(false);
    }
  };

  const testGetStudents = async () => {
    setIsApiLoading(true);
    setActiveTest('GET /students');
    try {
      const res = await api.get('/students');
      setApiResponse(res.data);
    } catch (err: any) {
      setApiResponse(err.response?.data || err.message);
    } finally {
      setIsApiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col">
      {/* Top Navigation Bar (Solid background, completely clean without dots) */}
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
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                1초 출결 체크
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
                <span className="font-semibold text-slate-800 dark:text-slate-200">{academy?.name}</span>의 출결, 수업 진도, 원비 수납 현황을 실시간으로 관리할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

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

            {/* 3. 1초 출결 체크 */}
            <Link
              href="/attendance"
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-md transition-all shadow-xs flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                  <CalendarCheck2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  1초 출결 체크
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  원터치 모바일 출결(출석, 결석, 지각, 조퇴) 및 보강 관리
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>출결 체크 바로가기</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>

            {/* 4. 수강료 & 수납 */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-700/50 hover:shadow-sm transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  수강료 & 수납 관리
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  매월 자동 청구서 발행, 결제 수단별 수납 및 미납자 관리
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
                <span>Phase 5 예정</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Security Status & Interactive API Tester */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* JWT Security Status */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">JWT 이중 토큰 보안 상태</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                보안 가동 중
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-slate-600 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Access Token (수명 15분, 무중단 자동 갱신)</span>
                </div>
                <p className="font-mono text-slate-700 dark:text-slate-300 break-all truncate text-[11px]">
                  {accessToken?.slice(0, 45)}...
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-slate-600 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Refresh Token (수명 7일, DB 해시 & RTR 적용)</span>
                </div>
                <p className="font-mono text-slate-700 dark:text-slate-300 break-all truncate text-[11px]">
                  {refreshToken?.slice(0, 45)}...
                </p>
              </div>
            </div>
          </div>

          {/* Interactive API Tester */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Code2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">실시간 백엔드 API 연동 테스트</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                현재 로그인된 토큰이 헤더에 첨부되어 백엔드와 실시간 통신합니다.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={testGetMe}
                  disabled={isApiLoading}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
                >
                  GET /auth/me
                </button>
                <button
                  onClick={testGetStudents}
                  disabled={isApiLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
                >
                  GET /students
                </button>
              </div>
            </div>

            {/* API Result Box */}
            <div className="p-3 rounded-xl bg-slate-900 dark:bg-slate-950 text-slate-100 min-h-[110px] max-h-[140px] overflow-y-auto font-mono text-[11px] border border-slate-800">
              {isApiLoading ? (
                <div className="h-full flex items-center justify-center text-slate-400 gap-2 py-5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>{activeTest} 요청 중...</span>
                </div>
              ) : apiResponse ? (
                <pre className="text-emerald-400">{JSON.stringify(apiResponse, null, 2)}</pre>
              ) : (
                <p className="text-slate-400 text-center py-5 text-xs">
                  위 버튼을 눌러 실제 API 응답을 확인해보세요.
                </p>
              )}
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
