'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showTodayShortcut?: boolean;
  align?: 'left' | 'right' | 'auto';
}

export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  className = '',
  showTodayShortcut = true,
  align = 'auto',
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedAlign, setResolvedAlign] = useState<'left' | 'right'>('left');
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial year and month from value or today
  const initialDate = value && !isNaN(Date.parse(value)) ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  // Sync view when value changes externally
  useEffect(() => {
    if (value && !isNaN(Date.parse(value))) {
      const d = new Date(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Calculate alignment based on bounding box
  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      if (align === 'right') {
        setResolvedAlign('right');
      } else if (align === 'left') {
        setResolvedAlign('left');
      } else {
        // Auto: check if there is enough space on the right (w-72 is 288px)
        const rect = containerRef.current.getBoundingClientRect();
        const spaceOnRight = window.innerWidth - rect.left;
        setResolvedAlign(spaceOnRight < 300 ? 'right' : 'left');
      }
    }
    setIsOpen(!isOpen);
  };

  // Format typed numeric input directly
  const handleInputChange = (val: string) => {
    const cleaned = val.replace(/[^0-9-]/g, '');
    const rawDigits = cleaned.replace(/[^0-9]/g, '');
    if (!cleaned.includes('-') && rawDigits.length === 8) {
      const formatted = `${rawDigits.slice(0, 4)}-${rawDigits.slice(4, 6)}-${rawDigits.slice(6, 8)}`;
      onChange(formatted);
      return;
    }
    onChange(cleaned);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    onChange(formatted);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Calculate calendar grid
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  const calendarDays: Array<{
    day: number;
    monthOffset: -1 | 0 | 1;
    dateStr: string;
    isSunday: boolean;
    isSaturday: boolean;
  }> = [];

  // Previous month padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const pDate = new Date(viewYear, viewMonth - 1, day);
    const dateStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({
      day,
      monthOffset: -1,
      dateStr,
      isSunday: pDate.getDay() === 0,
      isSaturday: pDate.getDay() === 6,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      day: d,
      monthOffset: 0,
      dateStr,
      isSunday: date.getDay() === 0,
      isSaturday: date.getDay() === 6,
    });
  }

  // Next month padding to fill standard 35 or 42 grid cells
  const totalSlots = calendarDays.length > 35 ? 42 : 35;
  const remaining = totalSlots - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const nDate = new Date(viewYear, viewMonth + 1, d);
    const dateStr = `${nDate.getFullYear()}-${String(nDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      day: d,
      monthOffset: 1,
      dateStr,
      isSunday: nDate.getDay() === 0,
      isSaturday: nDate.getDay() === 6,
    });
  }

  const weekLabels = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-1.5 ${isOpen ? 'z-50' : 'z-20'} ${className}`}>
      {/* Input Group */}
      <div className="relative flex-1 flex items-center min-w-0">
        <button
          type="button"
          onClick={handleToggle}
          className="absolute left-2.5 p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer z-10"
          aria-label="달력 열기"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
        </button>

        <input
          type="text"
          maxLength={10}
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (!isOpen && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const spaceOnRight = window.innerWidth - rect.left;
              setResolvedAlign(align === 'right' || spaceOnRight < 300 ? 'right' : 'left');
            }
            setIsOpen(true);
          }}
          className="w-full pl-8 pr-2.5 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-xs font-semibold placeholder-slate-400 text-center tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-2xs"
        />
      </div>

      {/* Quick Today Button */}
      {showTodayShortcut && (
        <button
          type="button"
          onClick={handleSelectToday}
          className="px-2.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0"
        >
          오늘
        </button>
      )}

      {/* Floating Custom Calendar Popup */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-[70] w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150 select-none ${
            resolvedAlign === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'
          }`}
        >
          {/* Calendar Header: Month/Year & Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              {viewYear}년 {viewMonth + 1}월
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold">
            {weekLabels.map((lbl, idx) => (
              <div
                key={lbl}
                className={`py-1 ${
                  idx === 0
                    ? 'text-rose-500'
                    : idx === 6
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400'
                }`}
              >
                {lbl}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((item, idx) => {
              const isSelected = value === item.dateStr;
              const isToday = item.dateStr === todayStr;
              const isCurrentMonth = item.monthOffset === 0;

              return (
                <button
                  key={`${item.dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDay(item.dateStr)}
                  className={`h-8 w-8 mx-auto rounded-xl flex items-center justify-center font-medium transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-xs shadow-indigo-600/30 scale-105'
                      : !isCurrentMonth
                      ? 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      : isToday
                      ? 'ring-1 ring-indigo-500 font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                      : item.isSunday
                      ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      : item.isSaturday
                      ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Bottom Actions Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              오늘 날짜 선택
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-[11px]"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
