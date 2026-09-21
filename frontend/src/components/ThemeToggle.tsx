'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores/useThemeStore';

interface ThemeToggleProps {
  className?: string;
  /** "lg" gives a 44px touch target for phone layouts. */
  size?: 'md' | 'lg';
}

export function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const sizeClass = size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';

  useEffect(() => {
    setMounted(true);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!mounted) {
    return (
      <div
        className={`${sizeClass} rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 ${className}`}
      />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className={`${sizeClass} rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs transition-ui cursor-pointer flex items-center justify-center shrink-0 ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600" />
      )}
    </button>
  );
}
