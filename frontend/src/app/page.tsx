'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { ThemeToggle } from '@/components/ThemeToggle';

const FEATURES = [
  {
    title: '원생 관리',
    body: '원생 등록, 학년 및 재원 상태 필터링과 학부모 연락처 통합 관리',
  },
  {
    title: '1초 출결 체크',
    body: '교실 안에서 모바일 터치 한 번으로 출결 기록 및 보강 관리',
  },
  {
    title: '수강료 & 수납',
    body: '매월 자동 청구서 발행, 결제 수단별 수납 이력 및 미납자 관리',
  },
  {
    title: '수업 일지 & 진도',
    body: '회차별 진도 범위 및 과제 완성도 기록, 학부모 상담용 피드백 축적',
  },
];

type PreviewTone = 'present' | 'late';

const PREVIEW_TONES: Record<PreviewTone, { pill: string; dot: string }> = {
  present: {
    pill: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  late: {
    pill: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
};

const PREVIEW_ROWS: {
  initials: string;
  name: string;
  className: string;
  note: string;
  status: string;
  tone: PreviewTone;
}[] = [
  { initials: '민준', name: '김민준', className: '중등 수학 심화A반', note: '학부모: 010-1234-****', status: '등원 완료 (17:30)', tone: 'present' },
  { initials: '서연', name: '이서연', className: '고등 영어 독해반', note: '학부모: 010-5678-****', status: '등원 완료 (17:28)', tone: 'present' },
  { initials: '도현', name: '박도현', className: '중등 과학 집중반', note: '사유: 수행평가로 10분 지각', status: '지각 도착 (17:40)', tone: 'late' },
];

const riseDelay = (ms: number) => ({ '--rise-delay': `${ms}ms` }) as React.CSSProperties;

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center group-hover:bg-indigo-700 transition-ui">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-ui active:scale-[0.97] cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>관리자 포털로 돌아가기</span>
              </Link>
            )}

            <ThemeToggle />

            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-ui active:scale-[0.97]"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-ui active:scale-[0.97]"
            >
              학원 무료 시작
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-20 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-12 lg:gap-16 items-center">
          <div>
            <h1 className="rise text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              학원 관리의 모든 것, <br />
              <span className="text-indigo-600 dark:text-indigo-400">간결하고 산뜻하게.</span>
            </h1>

            <p
              className="rise mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed"
              style={riseDelay(60)}
            >
              복잡한 서류 작업과 엑셀 대신, 1초 출결 체크부터 수강료 청구/수납, 수업 진도 일지까지 한곳에서 스마트하게 처리하세요.
            </p>

            <div className="rise mt-8 flex flex-col sm:flex-row gap-3 sm:w-auto" style={riseDelay(120)}>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-ui active:scale-[0.97]"
              >
                <span>지금 로그인하기</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-ui active:scale-[0.97]"
              >
                <span>학원 신규 개설 (원장님)</span>
              </Link>
            </div>
          </div>

          {/* Sample of the attendance board, the product's core screen. Decorative, so hidden from assistive tech. */}
          <div
            aria-hidden="true"
            className="rise rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden text-left"
            style={riseDelay(200)}
          >
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>오늘 실시간 출결 체크 현황</span>
              <span className="text-indigo-600 dark:text-indigo-400">원터치 출결 모드 ON</span>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {PREVIEW_ROWS.map((row) => (
                <li key={row.name} className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold flex items-center justify-center text-xs">
                      {row.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {row.name}{' '}
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">({row.className})</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.note}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tabular-nums ${PREVIEW_TONES[row.tone].pill}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${PREVIEW_TONES[row.tone].dot}`} />
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-label="주요 기능" className="border-t border-slate-200 dark:border-slate-800">
          <dl className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 divide-y divide-slate-200 dark:divide-slate-800">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="py-5 grid gap-1 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8">
                <dt className="text-sm font-bold text-slate-900 dark:text-white">{feature.title}</dt>
                <dd className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 z-30">
        <p>© 2026 ClassHelper. 올인원 학원 통합 관리 플랫폼</p>
      </footer>
    </div>
  );
}
