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
  Sparkles,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  CreditCard,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/lib/auth-service';
import { attendanceService } from '@/lib/attendance-service';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';

interface AppNavbarProps {
  currentPath?: string;
}

export function AppNavbar({ currentPath }: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activePath = currentPath || pathname;
  const { user, academy, isAuthenticated, isHydrated, logout } = useAuthStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasUnattendedAlert, setHasUnattendedAlert] = useState(false);
  const [unattendedCount, setUnattendedCount] = useState(0);

  // Poll unattended status for active alert indicator
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      const checkUnattended = async () => {
        try {
          const res = await attendanceService.getUnattendedStatus();
          setHasUnattendedAlert(res.isUnattendedAlertActive);
          setUnattendedCount(res.unattendedCount);
        } catch {
          // ignore
        }
      };

      checkUnattended();
      const interval = setInterval(checkUnattended, 20000);
      return () => clearInterval(interval);
    }
  }, [isHydrated, isAuthenticated]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
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

  const navLinks = [
    {
      label: '대시보드',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: activePath === '/dashboard',
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
    {
      label: '수강료 & 수납',
      href: '/tuition',
      icon: CreditCard,
      active: activePath === '/tuition',
    },
  ];

  if (!isHydrated || !isAuthenticated || !user) {
    return null;
  }

  const roleBadge = getRoleBadge(user.role);

  return (
    <>
      <header className="border-b border-slate-200/90 dark:border-slate-800/90 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Brand & Desktop Navigation */}
          <div className="flex items-center gap-3.5">
            <Link
              href={user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs group-hover:bg-indigo-700 transition-colors">
                <GraduationCap className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
              </span>
            </Link>

            {academy && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-semibold shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="truncate max-w-[160px]">{academy.name}</span>
              </div>
            )}

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      link.active
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 shadow-2xs'
                        : link.alert
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 animate-pulse'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                    {link.alert && (
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions, Badges, Profile & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Super Admin Quick Portal Jump */}
            {user.role === 'SUPER_ADMIN' && activePath !== '/admin' && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs shadow-purple-600/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>관리자 포털</span>
              </Link>
            )}

            {/* Notification Bell Dropdown */}
            <NotificationBell />

            {/* Dark / Light Theme Toggle */}
            <ThemeToggle />

            {/* Desktop User Info & Role Badge */}
            <div className="hidden lg:flex flex-col items-end mr-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {user.name}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {user.email}
              </span>
            </div>

            <span
              className={`hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-md font-semibold border ${roleBadge.color}`}
            >
              {roleBadge.label}
            </span>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="로그아웃"
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">로그아웃</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="메뉴 열기"
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs cursor-pointer"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <div className="relative">
                  <Menu className="w-5 h-5" />
                  {hasUnattendedAlert && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
                  )}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl">
            {academy && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {academy.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {user.name} ({roleBadge.label})
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      link.active
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 font-bold'
                        : link.alert
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </div>
                    {link.alert && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                        미등원 {link.alertCount}명
                      </span>
                    )}
                  </Link>
                );
              })}

              <Link
                href="/notifications"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activePath === '/notifications'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4" />
                  <span>알림 센터</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              {user.role === 'SUPER_ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>관리자 포털로 이동</span>
                </Link>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-bold cursor-pointer hover:bg-rose-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
