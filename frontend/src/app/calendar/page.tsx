'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Users,
  BookOpen,
  Clock,
  Sparkles,
  AlertCircle,
  CalendarCheck2,
  Phone,
  Trash2,
  Edit3,
  X,
  Loader2,
  List,
  Grid,
  CalendarDays,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { classesService, ClassItem, EnrolledStudent } from '@/lib/classes-service';
import { studentsService, StudentItem } from '@/lib/students-service';
import {
  calendarService,
  AcademyEvent,
  EventCategory,
  EventColor,
  EVENT_CATEGORY_META,
  COLOR_CLASSES,
} from '@/lib/calendar-service';
import { AppLayout } from '@/components/common/AppLayout';
import { CustomDatePicker } from '@/components/CustomDatePicker';

type CalendarViewMode = 'MONTH' | 'WEEK_TIMETABLE' | 'AGENDA';

export default function CalendarPage() {
  const router = useRouter();
  const { academy, isAuthenticated, isHydrated } = useAuthStore();

  // Current Date States
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // View Mode
  const [viewMode, setViewMode] = useState<CalendarViewMode>('MONTH');

  // Data States
  const [events, setEvents] = useState<AcademyEvent[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classRosters, setClassRosters] = useState<Record<number, EnrolledStudent[]>>({});
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | EventCategory>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademyEvent | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventCategory, setEventCategory] = useState<EventCategory>('ACADEMY');
  const [eventStartDate, setEventStartDate] = useState(selectedDate);
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventColor, setEventColor] = useState<EventColor>('INDIGO');
  const [eventModalError, setEventModalError] = useState<string | null>(null);

  // Class Roster Modal State (for Weekly Timetable Class Click)
  const [selectedClassForRosterModal, setSelectedClassForRosterModal] = useState<ClassItem | null>(null);
  const [isClassRosterModalOpen, setIsClassRosterModalOpen] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // ESC key to close all modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEventModalOpen(false);
        setIsClassRosterModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load All Calendar Data (Events, Classes, Rosters)
  useEffect(() => {
    if (isHydrated && isAuthenticated && academy) {
      loadCalendarData();
    }
  }, [isHydrated, isAuthenticated, academy]);

  const loadCalendarData = async () => {
    if (!academy) return;
    setIsLoading(true);
    try {
      const [eventsData, classesRes, studentsRes] = await Promise.all([
        calendarService.getEvents(academy.id),
        classesService.getClasses().catch(() => ({ items: [] })),
        studentsService.getStudents({ limit: 100 }).catch(() => ({ items: [] })),
      ]);

      setEvents(eventsData);
      setClasses(classesRes.items || []);
      setStudents(studentsRes.items || []);

      // Load rosters for each class in parallel for instant student scheduling
      const rosterMap: Record<number, EnrolledStudent[]> = {};
      await Promise.all(
        (classesRes.items || []).map(async (cls) => {
          try {
            const enrollments = await classesService.getEnrolledStudents(cls.id);
            rosterMap[cls.id] = (enrollments || []).map((e) => e.student).filter(Boolean);
          } catch {
            rosterMap[cls.id] = [];
          }
        }),
      );
      setClassRosters(rosterMap);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Month Navigation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate(),
      ).padStart(2, '0')}`,
    );
  };

  // Helper: Parse Korean day of week string from class schedule (e.g. "월,수,금 16:00-18:00")
  const parseClassScheduleDays = (scheduleStr?: string | null): string[] => {
    if (!scheduleStr) return [];
    const days: string[] = [];
    const koreanDays = ['월', '화', '수', '목', '금', '토', '일'];
    for (const d of koreanDays) {
      if (scheduleStr.includes(d)) {
        days.push(d);
      }
    }
    return days;
  };

  // Get Day of Week Name in Korean for a Date String (YYYY-MM-DD)
  const getKoreanDayOfWeek = (dateStr: string): string => {
    const dayIndex = new Date(dateStr).getDay(); // 0: 일, 1: 월, ...
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[dayIndex];
  };

  // Calculate classes running on a specific Date
  const getClassesForDate = (dateStr: string): ClassItem[] => {
    const dayOfWeek = getKoreanDayOfWeek(dateStr);
    return classes.filter((cls) => {
      if (classFilter !== 'ALL' && cls.id !== Number(classFilter)) {
        return false;
      }
      const days = parseClassScheduleDays(cls.schedule);
      return days.includes(dayOfWeek);
    });
  };

  // Calculate events occurring on a specific Date
  const getEventsForDate = (dateStr: string): AcademyEvent[] => {
    return events.filter((evt) => {
      if (categoryFilter !== 'ALL' && evt.category !== categoryFilter) {
        return false;
      }
      if (evt.endDate) {
        return dateStr >= evt.startDate && dateStr <= evt.endDate;
      }
      return evt.startDate === dateStr;
    });
  };

  // Calculate students scheduled to attend on a specific Date
  const getStudentsForDate = (dateStr: string) => {
    const classesOnDay = getClassesForDate(dateStr);
    const studentList: Array<{ student: EnrolledStudent; classItem: ClassItem }> = [];
    const seenStudentIds = new Set<number>();

    for (const cls of classesOnDay) {
      const roster = classRosters[cls.id] || [];
      for (const st of roster) {
        if (!seenStudentIds.has(st.id)) {
          seenStudentIds.add(st.id);
          studentList.push({ student: st, classItem: cls });
        }
      }
    }

    if (studentSearch.trim()) {
      const query = studentSearch.trim().toLowerCase();
      return studentList.filter(
        (item) =>
          item.student.name.toLowerCase().includes(query) ||
          (item.student.grade && item.student.grade.toLowerCase().includes(query)) ||
          item.classItem.name.toLowerCase().includes(query),
      );
    }

    return studentList;
  };

  // Calendar Grid Days Calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0: 일, 1: 월...
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfWeek: number;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month filler days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dayOfWeek: new Date(dateStr).getDay(),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        dayOfWeek: new Date(dateStr).getDay(),
      });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
      const nextM = month + 2 > 12 ? 1 : month + 2;
      const nextY = month + 2 > 12 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        dayOfWeek: new Date(dateStr).getDay(),
      });
    }

    return days;
  }, [year, month]);

  // Modal Handlers: Add / Edit Event
  const handleOpenAddEventModal = (targetDate?: string) => {
    setEditingEvent(null);
    setEventTitle('');
    setEventCategory('ACADEMY');
    setEventStartDate(targetDate || selectedDate);
    setEventEndDate('');
    setEventStartTime('');
    setEventEndTime('');
    setEventDescription('');
    setEventColor('INDIGO');
    setEventModalError(null);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEventModal = (evt: AcademyEvent) => {
    setEditingEvent(evt);
    setEventTitle(evt.title);
    setEventCategory(evt.category);
    setEventStartDate(evt.startDate);
    setEventEndDate(evt.endDate || '');
    setEventStartTime(evt.startTime || '');
    setEventEndTime(evt.endTime || '');
    setEventDescription(evt.description || '');
    setEventColor(evt.color);
    setEventModalError(null);
    setIsEventModalOpen(true);
  };

  const handleSaveEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academy) return;

    if (!eventTitle.trim()) {
      setEventModalError('일정 제목을 입력해 주세요.');
      return;
    }
    if (!eventStartDate) {
      setEventModalError('시작 날짜를 선택해 주세요.');
      return;
    }

    try {
      if (editingEvent) {
        await calendarService.updateEvent(academy.id, editingEvent.id, {
          title: eventTitle.trim(),
          category: eventCategory,
          startDate: eventStartDate,
          endDate: eventEndDate || undefined,
          startTime: eventStartTime || undefined,
          endTime: eventEndTime || undefined,
          description: eventDescription.trim() || undefined,
          color: eventColor,
        });
      } else {
        await calendarService.createEvent(academy.id, {
          title: eventTitle.trim(),
          category: eventCategory,
          startDate: eventStartDate,
          endDate: eventEndDate || undefined,
          startTime: eventStartTime || undefined,
          endTime: eventEndTime || undefined,
          description: eventDescription.trim() || undefined,
          color: eventColor,
        });
      }

      const updated = await calendarService.getEvents(academy.id);
      setEvents(updated);
      setIsEventModalOpen(false);
    } catch (err: any) {
      setEventModalError(err.message || '일정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteEvent = async (evt: AcademyEvent) => {
    if (!academy) return;
    if (!confirm(`'${evt.title}' 일정을 삭제하시겠습니까?`)) return;

    try {
      await calendarService.deleteEvent(academy.id, evt.id);
      const updated = await calendarService.getEvents(academy.id);
      setEvents(updated);
    } catch (err: any) {
      alert(err.message || '일정 삭제 중 오류가 발생했습니다.');
    }
  };

  // Open Class Roster Modal from Timetable
  const handleOpenClassRosterModal = (cls: ClassItem) => {
    setSelectedClassForRosterModal(cls);
    setIsClassRosterModalOpen(true);
  };

  // Selected date info
  const selectedDateEvents = useMemo(() => getEventsForDate(selectedDate), [selectedDate, events, categoryFilter]);
  const selectedDateClasses = useMemo(() => getClassesForDate(selectedDate), [selectedDate, classes, classFilter]);
  const selectedDateStudents = useMemo(
    () => getStudentsForDate(selectedDate),
    [selectedDate, classes, classRosters, classFilter, studentSearch],
  );

  return (
    <AppLayout currentPath="/calendar">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {/* Top Header Title & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              스마트 학원 통합 캘린더
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              학원 공식 일정, 시험 대비 계획, 요일별 반 수업 시간표 및 등원 예정 수강생을 한눈에 파악하세요.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddEventModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer hover:scale-102 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>학원 일정 등록</span>
          </button>
        </div>

        {/* Top Main Controls Bar: Month Switcher, View Switcher & Student Search */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Left: Month Navigation Capsule & View Mode Switcher */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Month Navigation Capsule */}
              <div className="flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="이전 달"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white min-w-[105px] text-center">
                  {year}년 {month + 1}월
                </span>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="다음 달"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleToday}
                  className="ml-1 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-colors cursor-pointer"
                >
                  오늘
                </button>
              </div>

              {/* View Mode Switcher Tabs */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('MONTH')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    viewMode === 'MONTH'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>월간 달력</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('WEEK_TIMETABLE')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    viewMode === 'WEEK_TIMETABLE'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>주간 시간표</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('AGENDA')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    viewMode === 'AGENDA'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>일정 목록</span>
                </button>
              </div>
            </div>

            {/* Right: Student Search & Class Selector */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Student Search Input */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="원생 이름 검색 (등원일 조회)..."
                  className="w-full pl-8 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => setStudentSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Target Class Selector */}
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">전체 개설 반 ({classes.length}개)</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.schedule || '시간 미지정'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Filter Pills (Sub Row) */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              전체 카테고리
            </button>
            {(Object.keys(EVENT_CATEGORY_META) as EventCategory[]).map((cat) => {
              const meta = EVENT_CATEGORY_META[cat];
              const isSelected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main View Area: Month Grid OR Weekly Timetable OR Agenda List */}
        {viewMode === 'MONTH' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Month Calendar Grid */}
            <div className="lg:col-span-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 sm:p-6 space-y-4">
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="text-rose-600 dark:text-rose-400">일 (Sun)</div>
                <div className="text-slate-700 dark:text-slate-300">월 (Mon)</div>
                <div className="text-slate-700 dark:text-slate-300">화 (Tue)</div>
                <div className="text-slate-700 dark:text-slate-300">수 (Wed)</div>
                <div className="text-slate-700 dark:text-slate-300">목 (Thu)</div>
                <div className="text-slate-700 dark:text-slate-300">금 (Fri)</div>
                <div className="text-blue-600 dark:text-blue-400">토 (Sat)</div>
              </div>

              {/* 35/42 Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarDays.map((day) => {
                  const dayEvents = getEventsForDate(day.dateStr);
                  const dayClasses = getClassesForDate(day.dateStr);
                  const isSelected = selectedDate === day.dateStr;

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`min-h-[90px] sm:min-h-[105px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                          : day.isToday
                          ? 'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                          : day.isCurrentMonth
                          ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          : 'bg-slate-100/30 dark:bg-slate-900/30 border-transparent opacity-40 hover:opacity-75'
                      }`}
                    >
                      {/* Cell Header: Date Number & Today Badge & Quick Add Button */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            day.dayOfWeek === 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : day.dayOfWeek === 6
                              ? 'text-blue-600 dark:text-blue-400'
                              : day.isToday
                              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {day.dayNumber}
                        </span>

                        <div className="flex items-center gap-1">
                          {day.isToday && (
                            <span className="px-1.5 py-0.2 rounded-md bg-indigo-600 text-white text-[9px] font-extrabold">
                              오늘
                            </span>
                          )}

                          {/* Quick Add Event on hover */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddEventModal(day.dateStr);
                            }}
                            title="이 날짜에 일정 추가"
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-opacity cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Cell Body: Event & Class Badges */}
                      <div className="space-y-1 my-1 overflow-hidden">
                        {/* 1. Academy Events */}
                        {dayEvents.slice(0, 2).map((evt) => {
                          const color = COLOR_CLASSES[evt.color] || COLOR_CLASSES.INDIGO;
                          return (
                            <div
                              key={evt.id}
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate border ${color.bg} ${color.text} ${color.border}`}
                              title={evt.title}
                            >
                              • {evt.title}
                            </div>
                          );
                        })}

                        {/* 2. Operating Classes Summary */}
                        {dayClasses.length > 0 && dayEvents.length < 2 && (
                          <div
                            className="px-1.5 py-0.5 rounded-md bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-[10px] font-semibold truncate flex items-center justify-between"
                            title={`${dayClasses.length}개 반 수업`}
                          >
                            <span>수업 {dayClasses.length}개 반</span>
                          </div>
                        )}

                        {/* More count */}
                        {dayEvents.length + dayClasses.length > 2 && (
                          <div className="text-[9px] font-bold text-slate-400 pl-1">
                            +{dayEvents.length + dayClasses.length - 2}건 더보기
                          </div>
                        )}
                      </div>

                      {/* Bottom Activity Dots */}
                      <div className="flex items-center gap-1 h-1.5">
                        {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                        {dayClasses.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 4 Cols: Selected Date Detailed Breakdown Panel */}
            <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 sm:p-6 space-y-6 flex flex-col justify-between">
              <div>
                {/* Date Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      선택된 날짜 상세 현황
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {selectedDate.replace('-', '년 ').replace('-', '월 ')}일 ({getKoreanDayOfWeek(selectedDate)}요일)
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAddEventModal(selectedDate)}
                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
                    title="이 날짜에 일정 추가"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* 1. Academy Events Section */}
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>학원 일정 & 계획 ({selectedDateEvents.length})</span>
                    </h4>
                  </div>

                  {selectedDateEvents.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                      등록된 학원 일정이 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedDateEvents.map((evt) => {
                        const color = COLOR_CLASSES[evt.color] || COLOR_CLASSES.INDIGO;
                        return (
                          <div
                            key={evt.id}
                            className={`p-3 rounded-2xl border ${color.bg} ${color.border} space-y-1.5 relative group`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {evt.title}
                                </span>
                              </div>

                              {/* Edit & Delete Action Buttons */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditEventModal(evt)}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEvent(evt)}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {EVENT_CATEGORY_META[evt.category]?.label}
                              </span>
                              {evt.startTime && (
                                <span>
                                  • {evt.startTime} ~ {evt.endTime || ''}
                                </span>
                              )}
                            </div>

                            {evt.description && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                {evt.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Classes & Rooms Section */}
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>운영 반 & 수업 시간표 ({selectedDateClasses.length})</span>
                    </h4>
                  </div>

                  {selectedDateClasses.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                      해당 요일에 예정된 정규 수업이 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedDateClasses.map((cls) => (
                        <div
                          key={cls.id}
                          onClick={() => handleOpenClassRosterModal(cls)}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs flex items-center justify-between cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs hover:bg-white dark:hover:bg-slate-800 transition-all group"
                          title="클릭하여 수강생 명단 조회"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {cls.name}
                              </span>
                              {cls.subject && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">
                                  {cls.subject}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{cls.schedule || '시간표 정보'}</span>
                              {cls.teacher && <span>• {cls.teacher.name} 강사</span>}
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-1">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                              {cls.enrolledCount}명 수강
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Expected Students Roster Section */}
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>등원 예정 수강생 명단 ({selectedDateStudents.length}명)</span>
                    </h4>
                  </div>

                  {selectedDateStudents.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                      등원 예정 원생이 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedDateStudents.map(({ student, classItem }) => (
                        <div
                          key={`${classItem.id}-${student.id}`}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] flex items-center justify-center">
                              {student.name.slice(0, 2)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {student.name}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1.5">
                                {classItem.name}
                              </span>
                            </div>
                          </div>

                          <a
                            href={`tel:${student.parentPhone}`}
                            className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                            title="학부모 전화 걸기"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{student.parentPhone}</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Quick Action: 1-Second Attendance Jump */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href="/attendance"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer hover:scale-101"
                >
                  <CalendarCheck2 className="w-4 h-4" />
                  <span>오늘 1초 출결 체크 바로가기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* View Mode 2: Weekly Timetable View */}
        {viewMode === 'WEEK_TIMETABLE' && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 sm:p-6 space-y-4 overflow-x-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>요일별 정규 수업 및 강의실 배치 시간표</span>
            </h3>

            <div className="grid grid-cols-7 gap-3 min-w-[750px]">
              {['월', '화', '수', '목', '금', '토', '일'].map((dayName) => {
                const dayClasses = classes.filter((cls) => {
                  const days = parseClassScheduleDays(cls.schedule);
                  return days.includes(dayName);
                });

                return (
                  <div
                    key={dayName}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-3 min-h-[300px]"
                  >
                    <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-700">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {dayName}요일
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {dayClasses.length}개 반 운영
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dayClasses.map((cls) => (
                        <div
                          key={cls.id}
                          onClick={() => handleOpenClassRosterModal(cls)}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs space-y-1 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md hover:scale-102 transition-all group"
                          title="클릭하여 수강생 명단 및 상세 정보 조회"
                        >
                          <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                            <span className="truncate">{cls.name}</span>
                            <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{cls.schedule}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span>{cls.teacher?.name || '강사 미지정'}</span>
                            <span className="font-semibold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">{cls.enrolledCount}명</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode 3: Agenda List View */}
        {viewMode === 'AGENDA' && (
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>학원 공식 일정 및 시험 대비 계획 타임라인</span>
            </h3>

            {events.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <p>등록된 일정이 없습니다. 상단의 <b>[학원 일정 등록]</b> 버튼으로 일정을 추가하세요.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {events
                  .slice()
                  .sort((a, b) => a.startDate.localeCompare(b.startDate))
                  .map((evt) => {
                    const color = COLOR_CLASSES[evt.color] || COLOR_CLASSES.INDIGO;
                    const isPassed = evt.startDate < new Date().toISOString().split('T')[0];

                    return (
                      <div
                        key={evt.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-2xl ${color.bg} ${color.text} border ${color.border} flex items-center justify-center font-bold text-xs shrink-0`}
                          >
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                {evt.title}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  EVENT_CATEGORY_META[evt.category]?.badgeClass
                                }`}
                              >
                                {EVENT_CATEGORY_META[evt.category]?.label}
                              </span>
                              {isPassed && (
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  (종료됨)
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                              <span>
                                📅 {evt.startDate} {evt.endDate ? `~ ${evt.endDate}` : ''}
                              </span>
                              {evt.startTime && (
                                <span>
                                  ⏰ {evt.startTime} {evt.endTime ? `- ${evt.endTime}` : ''}
                                </span>
                              )}
                            </p>

                            {evt.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                {evt.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEventModal(evt)}
                            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(evt)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal 1: Add / Edit Academy Event */}
      {isEventModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEventModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
            <button
              type="button"
              onClick={() => setIsEventModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingEvent ? '학원 일정 수정' : '새 학원 일정 및 계획 등록'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  시험 대비 기간, 설명회, 학부모 상담, 휴원일 등 주요 학원 일정을 캘린더에 기록하세요.
                </p>
              </div>
            </div>

            {eventModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{eventModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEventSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Event Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  일정 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="예: 2학기 중간고사 대비 집중 특강, 학부모 설명회"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    카테고리
                  </label>
                  <select
                    value={eventCategory}
                    onChange={(e) => {
                      const cat = e.target.value as EventCategory;
                      setEventCategory(cat);
                      setEventColor(EVENT_CATEGORY_META[cat]?.defaultColor || 'INDIGO');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {(Object.keys(EVENT_CATEGORY_META) as EventCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {EVENT_CATEGORY_META[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    색상 태그
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {(['INDIGO', 'PURPLE', 'ROSE', 'AMBER', 'EMERALD', 'BLUE'] as EventColor[]).map(
                      (c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEventColor(c)}
                          className={`w-6 h-6 rounded-full ${COLOR_CLASSES[c].dot} transition-transform cursor-pointer ${
                            eventColor === c ? 'scale-125 ring-2 ring-slate-900 dark:ring-white' : 'opacity-70'
                          }`}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    시작 날짜 <span className="text-rose-500">*</span>
                  </label>
                  <CustomDatePicker
                    value={eventStartDate}
                    onChange={setEventStartDate}
                    placeholder="시작 날짜 선택"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    종료 날짜 (선택)
                  </label>
                  <CustomDatePicker
                    value={eventEndDate}
                    onChange={setEventEndDate}
                    placeholder="종료 날짜 (당일이면 공란)"
                  />
                </div>
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    시작 시간 (선택)
                  </label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    종료 시간 (선택)
                  </label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  상세 메모 & 내용
                </label>
                <textarea
                  rows={3}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="일정 세부 내용, 준비물, 대상 학년 등을 자유롭게 입력하세요."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {editingEvent ? '수정 완료' : '일정 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Weekly Timetable Class Student Roster Modal */}
      {isClassRosterModalOpen && selectedClassForRosterModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsClassRosterModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="w-full max-w-xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {selectedClassForRosterModal.name}
                    </h3>
                    {selectedClassForRosterModal.subject && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                        {selectedClassForRosterModal.subject}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    수업 시간표: {selectedClassForRosterModal.schedule || '시간표 정보 없음'} • 담당: {selectedClassForRosterModal.teacher?.name || '강사 미지정'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsClassRosterModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Class Summary Metrics */}
              <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-center">
                <div>
                  <span className="text-[11px] text-slate-400 block">수강생</span>
                  <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                    {classRosters[selectedClassForRosterModal.id]?.length ?? selectedClassForRosterModal.enrolledCount}명
                  </span>
                  {selectedClassForRosterModal.capacity && (
                    <span className="text-[10px] text-slate-400 block">/ 정원 {selectedClassForRosterModal.capacity}명</span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">대상 학년</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-1">
                    {selectedClassForRosterModal.targetGrade || '전체'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">월 수강료</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-1">
                    {Number(selectedClassForRosterModal.monthlyFee || 0).toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* Student Roster List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>배정된 수강생 명단 ({classRosters[selectedClassForRosterModal.id]?.length || 0}명)</span>
                  </h4>
                </div>

                {(!classRosters[selectedClassForRosterModal.id] || classRosters[selectedClassForRosterModal.id].length === 0) ? (
                  <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 space-y-2">
                    <p>현재 이 반에 배정된 원생이 없습니다.</p>
                    <Link
                      href="/classes"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100"
                    >
                      <span>반 관리에서 수강생 배정하기 →</span>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 max-h-60 overflow-y-auto">
                    {classRosters[selectedClassForRosterModal.id].map((st, idx) => (
                      <div
                        key={st.id || idx}
                        className="p-3 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {st.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {st.name}
                              </span>
                              {st.grade && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                                  {st.grade}
                                </span>
                              )}
                              {st.schoolName && (
                                <span className="text-[10px] text-slate-400">
                                  ({st.schoolName})
                                </span>
                              )}
                            </div>
                            {st.studentPhone && (
                              <p className="text-[11px] text-slate-400 font-mono">
                                학생: {st.studentPhone}
                              </p>
                            )}
                          </div>
                        </div>

                        {st.parentPhone && (
                          <a
                            href={`tel:${st.parentPhone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-colors"
                            title="학부모 전화 걸기"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="font-mono">{st.parentPhone}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <Link
                href="/classes"
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
              >
                반 관리 이동
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsClassRosterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  닫기
                </button>
                <Link
                  href="/attendance"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all"
                >
                  <CalendarCheck2 className="w-3.5 h-3.5" />
                  <span>이 반 출결 체크하기</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
