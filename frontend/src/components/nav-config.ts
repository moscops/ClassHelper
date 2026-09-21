import { LayoutDashboard, Users, BookOpen, CalendarCheck2, type LucideIcon } from 'lucide-react';

export type NavGroup = 'work' | 'manage';

export interface NavItem {
  href: string;
  label: string;
  /** Short label for the phone tab bar. */
  shortLabel: string;
  icon: LucideIcon;
  group: NavGroup;
  /** Roles that must not see this item (screen-level only; the server still enforces access). */
  hideFor?: readonly string[];
  /** Position in the phone tab bar, where attendance comes first. */
  phoneOrder: number;
}

// Sidebar order. 출결 is the lead promise of the product, so it leads the phone tab bar.
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: '대시보드', shortLabel: '대시보드', icon: LayoutDashboard, group: 'work', phoneOrder: 2 },
  { href: '/attendance', label: '출결', shortLabel: '출결', icon: CalendarCheck2, group: 'work', phoneOrder: 1 },
  { href: '/students', label: '원생 관리', shortLabel: '원생', icon: Users, group: 'manage', hideFor: ['TEACHER'], phoneOrder: 3 },
  { href: '/classes', label: '반 & 수강생 관리', shortLabel: '반', icon: BookOpen, group: 'manage', hideFor: ['TEACHER'], phoneOrder: 4 },
];

export const NAV_GROUP_LABEL: Record<NavGroup, string> = { work: '업무', manage: '관리' };

export const navItemsFor = (role: string | undefined) =>
  NAV_ITEMS.filter((item) => !role || !item.hideFor?.includes(role));

export const phoneTabsFor = (role: string | undefined) =>
  [...navItemsFor(role)].sort((a, b) => a.phoneOrder - b.phoneOrder);

export const NEUTRAL_BADGE =
  'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

export const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN: {
    label: '플랫폼 관리자',
    color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  OWNER: {
    label: '원장님',
    color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  ADMIN: {
    label: '부원장/실장',
    color: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  TEACHER: {
    label: '강사',
    color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  STAFF: { label: '직원/조교', color: NEUTRAL_BADGE },
};

export const isNavActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
