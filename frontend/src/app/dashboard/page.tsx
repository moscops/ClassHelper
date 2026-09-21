'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ShieldCheck,
  Key,
  RefreshCw,
  Code2,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/lib/auth-service';
import { api } from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';
import { TodayBoard } from '@/components/dashboard/TodayBoard';
import { ROLE_BADGES } from '@/components/nav-config';

// The token and API-tester panels are developer tooling; production builds drop them.
const IS_DEV = process.env.NODE_ENV === 'development';

export default function DashboardPage() {
  const router = useRouter();
  const { user, academy, accessToken, refreshToken, isAuthenticated, isHydrated } =
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

  const todayLabel = format(new Date(), 'M월 d일 EEEE', { locale: ko });
  const roleLabel = ROLE_BADGES[user.role]?.label ?? user.role;

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-ui duration-200 flex flex-col">
      <AppHeader />

      <main className="flex-1 relative overflow-hidden py-8">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">대시보드</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {todayLabel}
            {academy ? ` · ${academy.name}` : ''} · {user.name} {roleLabel}
          </p>
        </div>

        <TodayBoard />

        {IS_DEV && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* JWT Security Status */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-ui">
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
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 flex flex-col justify-between transition-ui">
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
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition-ui disabled:opacity-50 cursor-pointer"
                >
                  GET /auth/me
                </button>
                <button
                  onClick={testGetStudents}
                  disabled={isApiLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-xs font-semibold text-white transition-ui disabled:opacity-50 cursor-pointer"
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
        )}
        </div>
      </main>
    </div>
  );
}
