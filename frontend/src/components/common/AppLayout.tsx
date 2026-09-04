'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  Building2,
  Users,
  BookOpen,
  CalendarCheck2,
  Bell,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ClipboardList,
  LayoutDashboard,
  CreditCard,
  Calendar,
  FileText,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavStatusStore } from '@/stores/useNavStatusStore';
import { authService } from '@/lib/auth-service';
import { ThemeToggle } from '@/components/ThemeToggle';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  alert?: boolean;
  alertCount?: number;
  adminOnly?: boolean;
  hasExclamation?: boolean;
  unreadCount?: number;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

export function AppLayout({ children, currentPath }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activePath = currentPath || pathname;
  const { user, academy, isAuthenticated, isHydrated, logout } = useAuthStore();
  const {
    hasUnattendedAlert,
    unattendedCount,
    unreadNotificationCount,
    updateStatus,
  } = useNavStatusStore();

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Background sync for status (preserves global cache across route changes)
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      updateStatus();
      const interval = setInterval(updateStatus, 25000);
      return () => clearInterval(interval);
    }
  }, [isHydrated, isAuthenticated, updateStatus]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      logout();
      router.replace('/login');
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          label: '플랫폼 관리자',
          color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'OWNER':
        return {
          label: '원장님',
          color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'ADMIN':
        return {
          label: '부원장/실장',
          color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        };
      case 'TEACHER':
        return {
          label: '강사',
          color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      default:
        return {
          label: '스태프',
          color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const navGroups: NavGroup[] = [
    {
      groupTitle: '메인 메뉴',
      items: [
        {
          label: '대시보드',
          href: '/dashboard',
          icon: LayoutDashboard,
          active: activePath === '/dashboard',
        },
        {
          label: '스마트 캘린더',
          href: '/calendar',
          icon: Calendar,
          active: activePath === '/calendar',
        },
        {
          label: '원생 관리',
          href: '/students',
          icon: Users,
          active: activePath === '/students',
        },
        {
          label: '반 & 수강생',
          href: '/classes',
          icon: BookOpen,
          active: activePath === '/classes',
        },
      ],
    },
    {
      groupTitle: '학사 & 수업 관리',
      items: [
        {
          label: '1초 출결 체크',
          href: '/attendance',
          icon: CalendarCheck2,
          active: activePath === '/attendance',
          alert: hasUnattendedAlert,
          alertCount: unattendedCount,
        },
        {
          label: '수업 일지 & 과제',
          href: '/class-logs',
          icon: ClipboardList,
          active: activePath === '/class-logs',
        },
        ...(user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
          ? [
              {
                label: '수강료 & 수납',
                href: '/tuition',
                icon: CreditCard,
                active: activePath === '/tuition',
              },
            ]
          : []),
      ],
    },
    {
      groupTitle: '알림 & 운영',
      items: [
        {
          label: '알림 관리 센터',
          href: '/notifications',
          icon: Bell,
          active: activePath === '/notifications',
          hasExclamation: unreadNotificationCount > 0,
          unreadCount: unreadNotificationCount,
        },
        {
          label: '리포트 관리',
          href: '/reports',
          icon: FileText,
          active: activePath === '/reports',
        },
        ...(user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
          ? [
              {
                label: '교직원 관리',
                href: '/staff',
                icon: UserCheck,
                active: activePath === '/staff',
              },
            ]
          : []),
        ...(user?.role === 'SUPER_ADMIN'
          ? [
              {
                label: '플랫폼 관리자 포털',
                href: '/admin',
                icon: ShieldCheck,
                active: activePath === '/admin',
                adminOnly: true,
              },
            ]
          : []),
      ],
    },
  ];

  if (!isHydrated || !isAuthenticated || !user) {
    return null;
  }

  const roleBadge = getRoleBadge(user.role);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 flex">
      {/* 1. Desktop Left Sidebar (Fixed on left, w-64) */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200/90 dark:border-slate-800/90 shadow-2xs">
        {/* Sidebar Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <Link
            href={user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs group-hover:bg-indigo-700 transition-colors shrink-0">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
            </span>
          </Link>
        </div>

        {/* Academy Info Banner */}
        {academy && (
          <div className="p-3 mx-3 my-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {academy.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                ID: #{academy.id} • SaaS 테넌트
              </p>
            </div>
          </div>
        )}

        {/* Navigation Groups List */}
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto pt-1 pb-4">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {group.groupTitle}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-colors duration-150 select-none ${
                      item.active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-600/20'
                        : item.alert
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        : item.adminOnly
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-transparent hover:bg-purple-100 dark:hover:bg-purple-900/40'
                        : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          item.active ? 'text-white' : ''
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* 미등원 긴급 알림 뱃지 */}
                      {item.alert && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                            item.active
                              ? 'bg-white text-rose-700'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {item.alertCount}명
                        </span>
                      )}

                      {/* 알림 관리 센터 느낌표 뱃지 */}
                      {item.hasExclamation && (
                        <span
                          className={`inline-flex items-center justify-center w-4.5 h-4.5 rounded-full text-xs font-black shrink-0 ${
                            item.active
                              ? 'bg-white text-indigo-700'
                              : 'bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                          }`}
                          title={`읽지 않은 알림 ${item.unreadCount}건`}
                        >
                          !
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: User Profile & Quick Actions (Bell Icon Removed) */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-xs shrink-0 border border-indigo-200 dark:border-indigo-800">
                {user.name.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user.name}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
            </div>

            <button
              onClick={handleLogout}
              title="로그아웃"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile & Tablet Top Bar (< 1024px) */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90 px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="메뉴 열기"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs cursor-pointer"
          >
            <div className="relative">
              <Menu className="w-5 h-5" />
              {hasUnattendedAlert && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
              )}
            </div>
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      {/* 3. Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col z-10 shadow-2xl border-r border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="h-16 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Academy Info */}
            {academy && (
              <div className="p-3 mx-3 my-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {academy.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {user.name} ({roleBadge.label})
                  </p>
                </div>
              </div>
            )}

            {/* Nav Groups */}
            <nav className="flex-1 px-3 space-y-4 overflow-y-auto py-2">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <div className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {group.groupTitle}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors duration-150 select-none ${
                          item.active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : item.alert
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            : 'text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.alert && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                                item.active
                                  ? 'bg-white text-rose-700'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {item.alertCount}명
                            </span>
                          )}
                          {item.hasExclamation && (
                            <span
                              className={`inline-flex items-center justify-center w-4.5 h-4.5 rounded-full text-xs font-black shrink-0 ${
                                item.active
                                  ? 'bg-white text-indigo-700'
                                  : 'bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                              }`}
                              title={`읽지 않은 알림 ${item.unreadCount}건`}
                            >
                              !
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Page Content (Offset for Left Sidebar on desktop, top offset on mobile) */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pt-16 lg:pt-0 relative overflow-x-hidden bg-ambient-mesh bg-tech-grid">
        {/* Atmospheric Ambient Glowing Orbs */}
        <div className="absolute -top-32 -left-20 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-indigo-500/12 via-indigo-600/6 to-transparent dark:from-indigo-500/18 dark:via-indigo-600/8 blur-[100px] pointer-events-none -z-10" />
        <div className="absolute top-20 -right-20 w-[36rem] h-[36rem] rounded-full bg-gradient-to-bl from-purple-500/10 via-fuchsia-500/5 to-transparent dark:from-purple-500/16 dark:via-fuchsia-500/8 blur-[120px] pointer-events-none -z-10" />
        <div className="absolute bottom-10 left-1/3 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-sky-400/8 via-cyan-400/4 to-transparent dark:from-sky-400/12 dark:via-cyan-400/6 blur-[100px] pointer-events-none -z-10" />

        {children}
      </div>
    </div>
  );
}
