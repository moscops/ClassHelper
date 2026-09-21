'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, Building2, ShieldCheck, LogOut, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/lib/auth-service';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  NAV_GROUP_LABEL,
  NEUTRAL_BADGE,
  ROLE_BADGES,
  isNavActive,
  navItemsFor,
  type NavGroup,
  type NavItem,
} from '@/components/nav-config';

const GROUPS: NavGroup[] = ['work', 'manage'];

const linkClass = (isActive: boolean) =>
  `relative flex items-center gap-3 py-2.5 rounded-lg text-sm transition-ui ${
    isActive
      ? 'font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60'
      : 'font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
  }`;

const iconButtonClass =
  'w-10 h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Students not yet marked in today's classes; shown on the 출결 item. */
  unmarked: number;
}

function NavLink({ item, collapsed, isActive, unmarked }: { item: NavItem; collapsed: boolean; isActive: boolean; unmarked: number }) {
  const Icon = item.icon;
  const badge = item.href === '/attendance' && unmarked > 0 ? unmarked : 0;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={`${linkClass(isActive)} ${collapsed ? 'justify-center' : 'px-3'}`}
    >
      <span className="relative flex">
        <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
        {collapsed && badge > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-status-unmarked-solid ring-2 ring-white dark:ring-slate-900"
          />
        )}
      </span>
      {collapsed ? (
        <span className="sr-only">
          {item.label}
          {badge > 0 ? `, 미체크 ${badge}명` : ''}
        </span>
      ) : (
        <>
          <span className="flex-1">{item.label}</span>
          {badge > 0 && (
            <span className="rounded-full bg-status-unmarked-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-status-unmarked">
              <span className="sr-only">미체크 </span>
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export function AppSidebar({ collapsed, onToggle, unmarked }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, academy, logout } = useAuthStore();

  if (!user) return null;

  const roleBadge = ROLE_BADGES[user.role] ?? { label: user.role, color: NEUTRAL_BADGE };
  const items = navItemsFor(user.role);

  const handleLogout = async () => {
    await authService.logout();
    logout();
    router.replace('/login');
  };

  return (
    <aside
      aria-label="사이드바"
      className={`hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div
        className={`h-16 flex items-center border-b border-slate-200 dark:border-slate-800 shrink-0 ${
          collapsed ? 'justify-center' : 'px-5'
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="ClassHelper 대시보드">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs">
            <GraduationCap className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
            </span>
          )}
        </Link>
      </div>

      {!collapsed && academy && (
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Building2 className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span className="truncate">{academy.name}</span>
          </div>
        </div>
      )}

      <nav aria-label="주요 메뉴" className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group}>
              {!collapsed && (
                <p className="px-3 mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {NAV_GROUP_LABEL[group]}
                </p>
              )}
              <ul aria-label={NAV_GROUP_LABEL[group]} className="space-y-1">
                {groupItems.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      item={item}
                      collapsed={collapsed}
                      isActive={isNavActive(pathname, item.href)}
                      unmarked={unmarked}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-800 px-2 py-3 space-y-2 shrink-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? '사이드바 펴기' : '사이드바 접기'}
          className={`flex w-full items-center gap-3 rounded-lg py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ${
            collapsed ? 'justify-center' : 'px-3'
          }`}
        >
          {collapsed ? (
            <ChevronsRight className="w-[18px] h-[18px]" aria-hidden="true" />
          ) : (
            <>
              <ChevronsLeft className="w-[18px] h-[18px]" aria-hidden="true" />
              <span>사이드바 접기</span>
            </>
          )}
        </button>

        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-3 py-1'}`} title={collapsed ? `${user.name} · ${roleBadge.label}` : undefined}>
          <span
            aria-hidden="true"
            className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-sm font-bold text-indigo-800 dark:text-indigo-200 flex items-center justify-center"
          >
            {user.name.slice(0, 1)}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{roleBadge.label}</p>
            </div>
          )}
        </div>

        {user.role === 'SUPER_ADMIN' && (
          <Link
            href="/admin"
            aria-label="관리자 포털로 돌아가기"
            title={collapsed ? '관리자 포털로 돌아가기' : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-ui active:scale-[0.97] ${
              collapsed ? 'w-10 h-10 mx-auto' : 'px-3 py-2'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-white" aria-hidden="true" />
            {!collapsed && <span>관리자 포털로 돌아가기</span>}
          </Link>
        )}

        <div className={`flex ${collapsed ? 'flex-col items-center gap-2' : 'items-center gap-2 px-1'}`}>
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            aria-label="로그아웃"
            title={collapsed ? '로그아웃' : undefined}
            className={
              collapsed
                ? iconButtonClass
                : 'flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 cursor-pointer'
            }
          >
            <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            {!collapsed && <span>로그아웃</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
