'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, Building2, ShieldCheck, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/lib/auth-service';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/students', label: '원생 관리' },
  { href: '/classes', label: '반 & 수강생 관리' },
  { href: '/attendance', label: '1초 출결 체크' },
];

const NEUTRAL_BADGE =
  'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: {
    label: '플랫폼 관리자',
    color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  OWNER: {
    label: '원장님 (OWNER)',
    color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  ADMIN: {
    label: '부원장/실장 (ADMIN)',
    color: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  TEACHER: {
    label: '강사 (TEACHER)',
    color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  STAFF: { label: '직원/조교 (STAFF)', color: NEUTRAL_BADGE },
};

const navLinkClass = (isActive: boolean, sizeClass: string) =>
  `${sizeClass} rounded-lg transition-ui ${
    isActive
      ? 'font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
      : 'font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
  }`;

const ADMIN_LINK_CLASS =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-ui active:scale-[0.97] cursor-pointer';

const LOGOUT_BUTTON_CLASS =
  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-ui cursor-pointer shadow-2xs';

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, academy, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  if (!user) return null;

  const roleBadge = ROLE_BADGES[user.role] ?? { label: user.role, color: NEUTRAL_BADGE };
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    await authService.logout();
    logout();
    router.replace('/login');
  };

  const academyChip = academy && (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
      <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
      <span>{academy.name}</span>
    </div>
  );

  const adminLink = isSuperAdmin && (
    <Link href="/admin" className={ADMIN_LINK_CLASS}>
      <ShieldCheck className="w-3.5 h-3.5 text-white" />
      <span>관리자 포털로 돌아가기</span>
    </Link>
  );

  const roleBadgeChip = (
    <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${roleBadge.color}`}>
      {roleBadge.label}
    </span>
  );

  const logoutButton = (extraClass = '') => (
    <button type="button" onClick={handleLogout} className={`${LOGOUT_BUTTON_CLASS} ${extraClass}`}>
      <LogOut className="w-3.5 h-3.5 text-slate-400" />
      <span>로그아웃</span>
    </button>
  );

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 shadow-2xs">
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
            </span>
          </Link>

          <div className="hidden md:block">{academyChip}</div>

          <nav aria-label="주요 메뉴" className="hidden md:flex items-center gap-1 ml-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={navLinkClass(isActive(item.href), 'px-3 py-1.5 text-xs')}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-2.5">
            {adminLink}
          </div>

          <ThemeToggle />

          <div className="hidden md:flex flex-col items-end mr-0.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</span>
          </div>

          <div className="hidden md:block">{roleBadgeChip}</div>
          <div className="hidden md:block">{logoutButton()}</div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            className="md:hidden w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs flex items-center justify-center shrink-0 cursor-pointer"
          >
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <>
          <div className="fixed inset-0 z-10 md:hidden" aria-hidden="true" onClick={() => setIsMenuOpen(false)} />
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-full z-20 md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <nav aria-label="모바일 메뉴" className="px-4 py-3 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={navLinkClass(isActive(item.href), 'px-3 py-2.5 text-sm')}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              {academyChip && <div className="flex">{academyChip}</div>}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex flex-col">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</span>
                </div>
                <div className="shrink-0">{roleBadgeChip}</div>
              </div>
              {adminLink && <div className="flex">{adminLink}</div>}
              {logoutButton('w-full justify-center py-2.5')}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
