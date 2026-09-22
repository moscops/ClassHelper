'use client';

import React from 'react';
import Link from 'next/link';
import { Ellipsis } from 'lucide-react';

export interface TabBarItem {
  href: string;
  /** Short label that fits under an icon on a 360px phone. */
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  /** 'alert' = urgent (unmarked students), 'notice' = informational (unread). */
  badge?: 'alert' | 'notice';
  /** Read out by screen readers next to the label when a badge is shown. */
  badgeLabel?: string;
}

interface MobileTabBarProps {
  items: TabBarItem[];
  onOpenMore: () => void;
  /** Password change pending: every destination except the change-password page is locked. */
  isLocked: boolean;
}

const BADGE_CLASS: Record<NonNullable<TabBarItem['badge']>, string> = {
  alert: 'bg-rose-600',
  notice: 'bg-amber-500',
};

const TAB_CLASS = 'h-full w-full flex flex-col items-center justify-center gap-1 text-xs transition-ui active:scale-[0.97] cursor-pointer';

// Phone navigation: the most-used destinations stay one thumb-tap away, the rest live behind "더보기".
export function MobileTabBar({ items, onOpenMore, isLocked }: MobileTabBarProps) {
  return (
    <nav
      aria-label="하단 메뉴"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex h-16">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1 min-w-0">
              <Link
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                aria-disabled={isLocked || undefined}
                onClick={(e) => {
                  if (isLocked) e.preventDefault();
                }}
                className={`${TAB_CLASS} ${isLocked ? 'opacity-40' : ''}`}
              >
                <span
                  className={`relative flex items-center justify-center rounded-full px-5 py-1 transition-ui ${
                    item.active
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  {item.badge && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-0.5 right-3 h-2 w-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${BADGE_CLASS[item.badge]}`}
                    />
                  )}
                </span>
                <span
                  className={
                    item.active
                      ? 'font-semibold text-indigo-700 dark:text-indigo-300'
                      : 'font-medium text-slate-600 dark:text-slate-400'
                  }
                >
                  {item.label}
                  {item.badge && item.badgeLabel && <span className="sr-only">, {item.badgeLabel}</span>}
                </span>
              </Link>
            </li>
          );
        })}

        <li className="flex-1 min-w-0">
          <button type="button" onClick={onOpenMore} aria-haspopup="dialog" className={TAB_CLASS}>
            <span className="flex items-center justify-center rounded-full px-5 py-1 text-slate-600 dark:text-slate-400">
              <Ellipsis className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className="font-medium text-slate-600 dark:text-slate-400">더보기</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
