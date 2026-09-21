'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, ShieldCheck, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/lib/auth-service';
import { useTodayBoard } from '@/lib/today-board';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AppSidebar } from '@/components/AppSidebar';
import { NEUTRAL_BADGE, ROLE_BADGES, isNavActive, phoneTabsFor } from '@/components/nav-config';

const STORAGE_KEY = 'classhelper_sidebar';
const LAPTOP_MIN_WIDTH = 1280;

type ShellState = 'expanded' | 'collapsed';

// Sidebar width choice: remembered per browser; a first visit on a laptop-width screen starts collapsed
// so wide tables keep their room. globals.css reads data-shell on <body> to reserve the space.
function useShellState() {
  const [state, setState] = useState<ShellState>('expanded');

  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'expanded' || saved === 'collapsed') setState(saved);
      else if (window.innerWidth < LAPTOP_MIN_WIDTH) setState('collapsed');
    } catch {
      // Storage can be blocked; the expanded sidebar is the safe default.
    }
  }, []);

  useLayoutEffect(() => {
    document.body.dataset.shell = state;
    return () => {
      delete document.body.dataset.shell;
    };
  }, [state]);

  const toggle = () => {
    const next: ShellState = state === 'expanded' ? 'collapsed' : 'expanded';
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisted, but the toggle still works for this page view.
    }
    setState(next);
  };

  return [state, toggle] as const;
}

const ADMIN_LINK_CLASS =
  'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold transition-ui active:scale-[0.97]';

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, academy, logout } = useAuthStore();
  const { data: board } = useTodayBoard(user);
  const [shell, toggleShell] = useShellState();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  useEffect(() => {
    if (!isAccountOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isAccountOpen]);

  if (!user) return null;

  const unmarked = board?.totals.unmarked ?? 0;
  const roleBadge = ROLE_BADGES[user.role] ?? { label: user.role, color: NEUTRAL_BADGE };
  const tabs = phoneTabsFor(user.role);

  const handleLogout = async () => {
    await authService.logout();
    logout();
    router.replace('/login');
  };

  return (
    <>
      <AppSidebar collapsed={shell === 'collapsed'} onToggle={toggleShell} unmarked={unmarked} />

      {/* Below lg: a slim top bar for identity and account, with navigation in the bottom tab bar. */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="relative z-20 h-14 px-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="ClassHelper 대시보드">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle size="lg" />
            <button
              type="button"
              onClick={() => setIsAccountOpen((open) => !open)}
              aria-expanded={isAccountOpen}
              aria-controls="account-menu"
              aria-label={isAccountOpen ? '계정 메뉴 닫기' : '계정 메뉴 열기'}
              className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
            >
              <span
                aria-hidden="true"
                className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-sm font-bold text-indigo-800 dark:text-indigo-200 flex items-center justify-center"
              >
                {user.name.slice(0, 1)}
              </span>
            </button>
          </div>
        </div>

        {isAccountOpen && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setIsAccountOpen(false)} />
            <div
              id="account-menu"
              className="absolute inset-x-0 top-full z-20 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="px-4 py-4 space-y-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    {roleBadge.label}
                    {academy ? ` · ${academy.name}` : ''}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>

                {user.role === 'SUPER_ADMIN' && (
                  <Link href="/admin" className={ADMIN_LINK_CLASS}>
                    <ShieldCheck className="w-4 h-4 text-white" aria-hidden="true" />
                    <span>관리자 포털로 돌아가기</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  <span>로그아웃</span>
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      <nav
        aria-label="하단 메뉴"
        className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex h-16">
          {tabs.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(pathname, item.href);
            const hasBadge = item.href === '/attendance' && unmarked > 0;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className="h-full flex flex-col items-center justify-center gap-1 text-xs transition-ui active:scale-95"
                >
                  <span
                    className={`relative flex items-center justify-center rounded-full px-5 py-1 ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {hasBadge && (
                      <span
                        aria-hidden="true"
                        className="absolute top-0.5 right-3 h-2 w-2 rounded-full bg-status-unmarked-solid ring-2 ring-white dark:ring-slate-900"
                      />
                    )}
                  </span>
                  <span
                    className={
                      isActive
                        ? 'font-semibold text-indigo-700 dark:text-indigo-300'
                        : 'font-medium text-slate-600 dark:text-slate-400'
                    }
                  >
                    {item.shortLabel}
                    {hasBadge && <span className="sr-only">, 미체크 {unmarked}명</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
