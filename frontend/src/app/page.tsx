'use client';

import React, { useEffect, useState } from 'react';
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
  Zap,
  Crown,
  Layers,
  MessageSquare,
  FileSpreadsheet,
  Calendar,
  ClipboardList,
  FileText,
  Send,
  HelpCircle,
  ChevronDown,
  Building2,
  Smartphone,
  Shield,
  Menu,
  Home,
  Laptop,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const leaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      if (user?.role === 'SUPER_ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isHydrated, isAuthenticated, user, router]);

  // ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsMenuOpen(true);
  };

  const handleMouseLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false);
    }, 200);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const navMenuItems = [
    {
      id: '#top',
      title: '1. 홈 (상단으로)',
      desc: 'ClassHelper 메인 소개',
      icon: Home,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    },
    {
      id: '#preview',
      title: '2. 대시보드 미리보기',
      desc: '실시간 출결 및 통계 윈도우 UI',
      icon: Laptop,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/60',
    },
    {
      id: '#features',
      title: '3. 주요 기능 한눈에 보기',
      desc: '올인원 학원 솔루션 6대 도메인',
      icon: Sparkles,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/60',
    },
    {
      id: '#attendance',
      title: '4. 1초 출결 & 알림톡',
      desc: '터치 출결 및 미등원 긴급 경고',
      icon: CalendarCheck2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    },
    {
      id: '#students',
      title: '5. 원생 관리 & CSV 일괄 등록',
      desc: '학년/상태 필터링 & 엑셀 3초 업로드',
      icon: Users,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/60',
    },
    {
      id: '#classes',
      title: '6. 반 개설 & 수강생 배정',
      desc: '정원 관리 & 자동완성 검색 매핑',
      icon: BookOpen,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/60',
    },
    {
      id: '#class-logs',
      title: '7. 수업 일지 & 1초 과제 검사',
      desc: '회차별 진도 기록 & 과제 피드백',
      icon: ClipboardList,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/60',
    },
    {
      id: '#tuition',
      title: '8. 수강료 청구 & 복합 수납',
      desc: '자동 청구서 & 카드/계좌 복합 결제',
      icon: CreditCard,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/60',
    },
    {
      id: '#reports',
      title: '9. 학습/출결 정기 리포트',
      desc: '종합 성적 통계 & 카카오 알림톡 전송',
      icon: FileText,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/60',
    },
    {
      id: '#pricing',
      title: '10. 요금제 안내 (Pricing)',
      desc: 'Free / Pro / Enterprise 3단 비교',
      icon: Zap,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/60',
    },
    {
      id: '#faq',
      title: '11. 자주 묻는 질문 (FAQ)',
      desc: '데이터 이전 및 주요 문의사항',
      icon: HelpCircle,
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800',
    },
  ];

  return (
    <div id="top" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-200 scroll-smooth">
      {/* 1. Top Sticky Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Hoverable Menu Button + Floating Popover Menu + Brand Logo */}
          <div className="flex items-center gap-3">
            {/* Hover Trigger Wrapper */}
            <div
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-1.5 py-2 px-2.5 sm:px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer shadow-2xs group"
                title="마우스를 올리면 메뉴가 나타납니다"
                aria-label="마우스를 올리면 메뉴가 나타납니다"
              >
                <Menu className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                <span className="text-xs font-bold hidden sm:inline">메뉴 둘러보기</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-indigo-600' : ''}`} />
              </button>

              {/* Hover-Activated Floating Popover Menu */}
              {isMenuOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-80 sm:w-88 max-h-[calc(100vh-5.5rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* Popover Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                          페이지 스크롤 목차
                        </p>
                        <p className="text-[10px] text-slate-400">클릭 시 해당 위치로 부드럽게 이동</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-800/60">
                      순서별 정렬
                    </span>
                  </div>

                  {/* Popover Items (Scrollable list) */}
                  <div className="p-2.5 overflow-y-auto flex-1 space-y-1 text-xs">
                    {navMenuItems.map((item, idx) => {
                      const IconComponent = item.icon;
                      return (
                        <a
                          key={idx}
                          href={item.id}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center gap-3 p-2 rounded-2xl hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50 group transition-all cursor-pointer border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/60"
                        >
                          <div className={`w-7 h-7 rounded-xl ${item.bg} flex items-center justify-center ${item.color} shrink-0 group-hover:scale-105 transition-transform shadow-2xs`}>
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-xs truncate">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {item.desc}
                            </p>
                          </div>
                          <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </a>
                      );
                    })}
                  </div>

                  {/* Popover Footer */}
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-2">
                    <Link
                      href="/register"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs text-center shadow-xs transition-all cursor-pointer"
                    >
                      무료 시작
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      로그인
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
              </span>
            </Link>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* If SUPER_ADMIN, show button to return to /admin */}
            {user?.role === 'SUPER_ADMIN' && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs shadow-purple-600/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>관리자 포털</span>
              </Link>
            )}

            <ThemeToggle />

            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
            >
              학원 무료 시작
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-ambient-mesh bg-tech-grid">
        {/* Atmospheric Ambient Glowing Orbs */}
        <div className="absolute -top-32 -left-20 w-[40rem] h-[40rem] rounded-full bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 -right-20 w-[40rem] h-[40rem] rounded-full bg-gradient-to-bl from-purple-500/12 via-pink-500/6 to-transparent blur-[120px] pointer-events-none -z-10" />
        <div className="absolute -bottom-32 left-1/4 w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr from-sky-400/10 via-cyan-400/5 to-transparent blur-[120px] pointer-events-none -z-10" />

        {/* Hero Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 flex flex-col items-center text-center justify-center relative z-10 w-full">
          {/* Floating Stat Badges (Left & Right) */}
          <div className="hidden lg:flex items-center gap-2 absolute top-20 left-4 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-lg text-xs text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">김민준 학생 등원 완료</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">카카오 알림톡 학부모 즉시 전송</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 absolute top-28 right-4 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-lg text-xs text-left animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">이번 달 원비 수납률 98.4%</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">자동 청구서 & 복합 수납 연동</p>
            </div>
          </div>

          {/* Subtle Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/80 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-6 shadow-xs backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>학원 원장님과 선생님을 위한 스마트 올인원 SaaS</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl leading-tight sm:leading-tight">
            학원 관리의 모든 것, <br />
            <span className="text-indigo-600 dark:text-indigo-400">
              간결하고 산뜻하게.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            복잡한 서류와 엑셀 대신, <span className="font-semibold text-slate-900 dark:text-white">1초 출결 체크</span>부터 <span className="font-semibold text-slate-900 dark:text-white">카카오 알림톡</span>, <span className="font-semibold text-slate-900 dark:text-white">수강료 청구/수납</span>, <span className="font-semibold text-slate-900 dark:text-white">수업 일지 및 정기 리포트</span>까지 한곳에서 스마트하게 처리하세요.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition-all hover:scale-102 cursor-pointer"
            >
              <span>학원 무료로 시작하기</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#pricing"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm shadow-xs transition-all hover:scale-102 cursor-pointer"
            >
              <span>요금제 알아보기</span>
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>

          {/* Product UI Preview Mockup (Windows Frame) */}
          <div id="preview" className="mt-14 w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700/80 shadow-2xl overflow-hidden text-left animate-in fade-in duration-500">
            {/* Windows 11 Title Bar */}
            <div className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between select-none">
              <div className="flex items-center">
                <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-t-lg mt-1 ml-2 shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="truncate max-w-[180px]">ClassHelper - 학원 관리</span>
                  <X className="w-3 h-3 text-slate-400 hover:text-slate-700 dark:hover:text-white ml-1 cursor-pointer" />
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] text-slate-600 dark:text-slate-300 font-mono w-64 justify-center shadow-2xs">
                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">https://app.classhelper.kr/dashboard</span>
              </div>

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
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">이번 달 수업 진도</p>
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
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400">1초 출결 모드 가동 중</span>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Core Feature Showcase Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">
              ALL-IN-ONE SOLUTION
            </h2>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              학원 운영에 필요한 모든 도메인을 하나로
            </p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              원생 등록, 1초 출결, 알림톡, 수강료 청구, 과제 관리, 정기 리포트까지 완벽하게 연동됩니다.
            </p>
          </div>

          {/* Feature 6-Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div id="attendance" className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600/60 transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  1초 출결 & 미등원 긴급 안심 알림
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  스마트폰/태블릿 터치 한 번으로 출석/지각/결석/조퇴를 기록하고, 수업 시작 시간이 지나도 미등원한 학생을 실시간 감지하여 경고합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>카카오 알림톡 자동 발송 연동</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div id="students" className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600/60 transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  원생 관리 & 대용량 CSV 일괄 등록
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  재원/휴원/퇴원 및 학년별 스마트 필터링과 기존 학원 엑셀 데이터를 드래그앤드롭 3단계 마법사로 한 번에 등록합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>중복 검사 & 대용량 안전 등록</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div id="classes" className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600/60 transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  반 개설 & 스마트 수강생 배정
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  정원 관리, 담당 강사 배정, 자동완성 Combobox 검색으로 원생을 빠르게 반에 매핑하고 요일별 시간표를 관리합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>스마트 학생 검색 & 배정 매핑</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div id="class-logs" className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600/60 transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  수업 일지 & 과제 1초 검사 피드백
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  수업 회차별 진도 범위와 교재를 기록하고, 수강생별 과제 완수율과 점수를 1초 만에 검사하여 피드백을 축적합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>학부모 상담용 피드백 축적</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div id="tuition" className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600/60 transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  수강료 청구 & 카드/계좌 복합 수납
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  매월 자동 청구서 발행, 카드/계좌/현금 복합 결제 수단 수납 및 미납자 관리까지 한눈에 파악할 수 있습니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>실시간 수납 통계 & 영수증 발행</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div id="reports" className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600/60 transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  학습 & 출결 정기 리포트 카카오 발송
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  기간별 출석률과 과제 완수율, 성적 데이터를 종합 분석하여 학부모님께 카카오 알림톡으로 정기 리포트를 1초 전송합니다.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                <Send className="w-3.5 h-3.5" />
                <span>반 전체 원클릭 일괄 발송 지원</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pricing Plans Section */}
      <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-950 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">
              PRICING PLANS
            </h2>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              학원 규모에 맞는 합리적이고 투명한 요금제
            </p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              신규 개설 시 기본 FREE 플랜이 무료 제공되며, 학원 성장에 맞춰 언제든 손쉽게 업그레이드할 수 있습니다.
            </p>
          </div>

          {/* 3 Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* 1. FREE Plan */}
            <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between transition-all hover:border-slate-400">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    FREE PLAN
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                    무료 체험
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₩0</span>
                  <span className="text-xs text-slate-400 font-medium">/ 평생 무료</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  소규모 교습소, 공부방 및 초기 도입 학원을 위한 기본 플랜
                </p>

                <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>재원생 최대 <strong>50명</strong> 등록</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>단일 학원 운영</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>1초 출결 체크 & 미등원 경고</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>수업 일지 및 진도 관리</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <X className="w-4 h-4 text-slate-300 shrink-0" />
                    <span className="line-through">카카오 알림톡 자동 연동</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/register"
                  className="block w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs text-center transition-colors cursor-pointer"
                >
                  무료로 시작하기
                </Link>
              </div>
            </div>

            {/* 2. PRO Plan (Popular) */}
            <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl flex flex-col justify-between relative transition-all hover:scale-102">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-extrabold px-4 py-1 rounded-full shadow-md">
                가장 추천하는 플랜
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 mt-1">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>PRO PLAN</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                    인기 플랜
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₩49,000</span>
                  <span className="text-xs text-slate-400 font-medium">/ 월 (부가세 포함)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  성장하는 일반 종합/단과 학원에 가장 최적화된 무제한 관리 플랜
                </p>

                <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>원생 인원 <strong>무제한</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>카카오 알림톡 자동 발송</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>수강료 청구 & 카드/계좌 복합 수납</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>과제 1초 검사 및 상세 리포트</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>학습/출결 리포트 카카오 전송</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/register"
                  className="block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs text-center shadow-md shadow-indigo-600/25 transition-colors cursor-pointer"
                >
                  Pro 플랜 시작하기
                </Link>
              </div>
            </div>

            {/* 3. ENTERPRISE Plan */}
            <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between transition-all hover:border-purple-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" />
                    <span>ENTERPRISE</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[11px] font-bold">
                    대형/프랜차이즈
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">맞춤 상담</span>
                  <span className="text-xs text-slate-400 font-medium">/ 지점 규모별</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  본원 및 다지점 직영/가맹 분원 통합 관리가 필요한 대형 학원 전용
                </p>

                <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>원생 & 강사 수 <strong>무제한</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>본원 / 분원 통합 멀티테넌시 제어</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>전담 기술 매니저 & 맞춤 커스텀 기능</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>대량 데이터 안전 마이그레이션 지원</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/register"
                  className="block w-full py-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs text-center border border-purple-200 dark:border-purple-800/80 transition-colors cursor-pointer"
                >
                  엔터프라이즈 문의하기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Frequently Asked Questions (FAQ) */}
      <section id="faq" className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center">
            <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">
              FAQ
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              자주 묻는 질문
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: '기존에 쓰던 엑셀 원생 명단을 그대로 옮길 수 있나요?',
                a: '네, 가능합니다! ClassHelper는 CSV 일괄 등록 마법사를 지원합니다. 기존 엑셀 데이터를 복사하여 표준 템플릿에 붙여넣고 업로드하면 중복 검사를 거쳐 수백 명의 원생을 3초 만에 안전하게 등록할 수 있습니다.',
              },
              {
                q: '카카오 알림톡은 별도 장비나 복잡한 계약이 필요한가요?',
                a: '아닙니다. 웹 브라우저가 실행되는 PC, 태블릿, 스마트폰만 있으면 즉시 사용 가능합니다. 출결 체크나 리포트 발송 시 학부모님의 카카오톡으로 실시간 자동 전송됩니다.',
              },
              {
                q: '강사님이나 조교 선생님별로 권한을 제한할 수 있나요?',
                a: '네, ClassHelper는 5단계 정밀 RBAC 권한 체계(원장, 부원장/실장, 강사, 조교, 플랫폼 관리자)를 탑재하고 있습니다. 강사는 본인 담당 반과 출결/과제만 열람 및 관리하도록 안전하게 격리됩니다.',
              },
              {
                q: '무료(Free) 플랜을 쓰다가 원생이 늘어나면 어떻게 되나요?',
                a: '언제든지 클릭 한 번으로 Pro 플랜으로 업그레이드하실 수 있습니다. 등록된 모든 원생, 출결 기록, 수업 일지 데이터는 100% 영구 보존됩니다.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left font-bold text-xs sm:text-sm text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      openFaqIndex === idx ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Bottom Call to Action Banner */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-purple-600 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            지금 바로 학원 관리를 1초 만에 스마트하게 바꾸세요
          </h2>
          <p className="text-indigo-100 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            복잡한 설정 없이 1분 만에 학원을 개설하고 바로 출결 및 원생 관리를 시작해보세요.
          </p>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-indigo-700 font-extrabold text-sm shadow-xl transition-all hover:scale-105 cursor-pointer"
            >
              <span>1분 만에 학원 개설하기</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10 bg-white dark:bg-slate-900 transition-colors z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-slate-900 dark:text-white">ClassHelper</span>
            <span>• 학원 통합 관리 SaaS 플랫폼</span>
          </div>
          <p>© 2026 ClassHelper. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

