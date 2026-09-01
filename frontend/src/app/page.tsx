'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CalendarCheck2,
  Users,
  CreditCard,
  BookOpen,
  Bell,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  Search,
  Check,
  Minus,
  Square,
  X,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      if (user?.role === 'SUPER_ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isHydrated, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-200">
      {/* Top Navbar (Solid background, completely clean without dots) */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            {/* If SUPER_ADMIN, show button to return to /admin */}
            {user?.role === 'SUPER_ADMIN' && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs shadow-purple-600/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>관리자 포털로 돌아가기</span>
              </Link>
            )}

            <ThemeToggle />

            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all"
            >
              학원 무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body Section with Ambient Glow Background */}
      <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-ambient-mesh bg-tech-grid">
        {/* Atmospheric Ambient Glowing Orbs */}
        <div className="absolute -top-32 -left-20 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 -right-20 w-[36rem] h-[36rem] rounded-full bg-gradient-to-bl from-purple-500/12 via-pink-500/6 to-transparent blur-[120px] pointer-events-none -z-10" />
        <div className="absolute -bottom-32 left-1/4 w-[36rem] h-[36rem] rounded-full bg-gradient-to-tr from-sky-400/10 via-cyan-400/5 to-transparent blur-[120px] pointer-events-none -z-10" />

        {/* Hero Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-20 flex flex-col items-center text-center justify-center relative z-10 w-full">
          {/* Floating Stat Badges (Left & Right) */}
          <div className="hidden lg:flex items-center gap-2 absolute top-16 left-4 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md text-xs text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">김민준 학생 등원</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">방금 학부모 알림톡 발송 완료</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 absolute top-24 right-4 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md text-xs text-left animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">이번 달 수납률 98.4%</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">미납자 3명 자동 안내</p>
            </div>
          </div>

          {/* Subtle Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/80 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-6 shadow-xs backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>선생님과 원장님을 위한 스마트 학원 관리 솔루션</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl leading-tight sm:leading-tight">
            학원 관리의 모든 것, <br />
            <span className="text-indigo-600 dark:text-indigo-400">
              간결하고 산뜻하게.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            복잡한 서류 작업과 엑셀 대신, 1초 출결 체크부터 수강료 청구/수납, 수업 진도 일지까지 한곳에서 스마트하게 처리하세요.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm shadow-indigo-600/20 transition-all hover:scale-102"
            >
              <span>지금 로그인하기</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm shadow-xs transition-all hover:scale-102"
            >
              <span>학원 신규 개설 (원장님)</span>
            </Link>
          </div>

          {/* Product UI Preview Mockup (Windows Frame) */}
          <div className="mt-14 w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700/80 shadow-2xl overflow-hidden text-left animate-in fade-in duration-500">
            {/* Windows 11 Title Bar */}
            <div className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between select-none">
              {/* Active Tab */}
              <div className="flex items-center">
                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-t-lg mt-1 ml-2 shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="truncate max-w-[180px]">ClassHelper - 학원 관리</span>
                  <X className="w-3 h-3 text-slate-400 hover:text-slate-700 dark:hover:text-white ml-1 cursor-pointer" />
                </div>
              </div>

              {/* URL Address Bar */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-slate-600 dark:text-slate-300 font-mono w-64 justify-center shadow-2xs">
                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">https://app.classhelper.kr/dashboard</span>
              </div>

              {/* Windows Window Controls (Minimize, Maximize, Close) */}
              <div className="flex items-center">
                <div className="w-10 h-8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
                  <Minus className="w-3.5 h-3.5" />
                </div>
                <div className="w-10 h-8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
                  <Square className="w-3 h-3" />
                </div>
                <div className="w-10 h-8 flex items-center justify-center hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Inner Dashboard Preview Body */}
            <div className="p-5 sm:p-6 space-y-5 bg-white dark:bg-slate-900">
              {/* Quick Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">오늘 재원생 출석률</p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">96.8%</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">62/64명 등원</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">이번 달 수업 일지</p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">28회</span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">진도 100% 달성</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">카카오 알림톡 발송</p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">142건</span>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">발송 성공 100%</span>
                  </div>
                </div>
              </div>

              {/* Attendance Mock List */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>오늘 실시간 출결 체크 현황</span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400">원터치 출결 모드 ON</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                        민준
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">김민준 <span className="text-[11px] text-slate-400 font-normal">(중등 수학 심화A반)</span></p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">학부모: 010-1234-****</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-[11px]">
                      🟢 등원 완료 (17:30)
                    </span>
                  </div>

                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
                        서연
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">이서연 <span className="text-[11px] text-slate-400 font-normal">(고등 영어 독해반)</span></p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">학부모: 010-5678-****</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-[11px]">
                      🟢 등원 완료 (17:28)
                    </span>
                  </div>

                  <div className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs">
                        도현
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">박도현 <span className="text-[11px] text-slate-400 font-normal">(중등 과학 집중반)</span></p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">사유: 수행평가로 10분 지각</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold text-[11px]">
                      🟡 지각 도착 (17:40)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Feature Highlights Grid */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left">
            {/* 1. 학생 관리 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3.5">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">원생 관리</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                원생 등록, 학년 및 재원 상태 필터링과 학부모 연락처 통합 관리
              </p>
            </div>

            {/* 2. 출결 관리 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3.5">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">1초 출결 체크</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                교실 안에서 모바일 터치 한 번으로 출결 기록 및 보강 관리
              </p>
            </div>

            {/* 3. 수납 관리 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-200 dark:hover:border-amber-800 transition-all">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">수강료 & 수납</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                매월 자동 청구서 발행, 결제 수단별 수납 이력 및 미납자 관리
              </p>
            </div>

            {/* 4. 수업 일지 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">수업 일지 & 진도</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                회차별 진도 범위 및 과제 완성도 기록, 학부모 상담용 피드백 축적
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer (Solid background, completely clean without dots) */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 transition-colors z-30">
        <p>© 2026 ClassHelper. 올인원 학원 통합 관리 플랫폼</p>
      </footer>
    </div>
  );
}
