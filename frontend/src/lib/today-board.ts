'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { classesService, type ClassItem } from '@/lib/classes-service';
import { attendanceService } from '@/lib/attendance-service';
import { parseSchedule } from '@/lib/schedule';
import type { UserProfile } from '@/types/auth';

export interface StatusCounts {
  present: number;
  absent: number;
  late: number;
  leave: number;
  unmarked: number;
}

export interface TodayClass {
  classItem: ClassItem;
  timeLabel: string | null;
  startMinutes: number | null;
  counts: StatusCounts;
  students: number;
}

export interface TodayBoard {
  /** yyyy-MM-dd, the day this board describes. */
  date: string;
  /** Classes held today, by start time. */
  scheduled: TodayClass[];
  /** Active classes whose schedule text names no weekday, so they cannot be placed on a day. */
  unscheduled: ClassItem[];
  /** Active classes whose schedule names other weekdays only. */
  heldOtherDays: number;
  totals: StatusCounts & { students: number };
}

const EMPTY_COUNTS: StatusCounts = { present: 0, absent: 0, late: 0, leave: 0, unmarked: 0 };
const CLASS_PAGE_LIMIT = 100;

async function loadTodayBoard(user: UserProfile, now: Date): Promise<TodayBoard> {
  const page = await classesService.getClasses({ status: 'ACTIVE', limit: CLASS_PAGE_LIMIT });
  const visible = user.role === 'TEACHER' ? page.items.filter((c) => c.teacherId === user.id) : page.items;

  const weekday = now.getDay();
  const parsed = visible.map((classItem) => ({ classItem, schedule: parseSchedule(classItem.schedule) }));
  const today = parsed.filter((p) => p.schedule.days?.includes(weekday));
  const unscheduled = parsed.filter((p) => p.schedule.days === null).map((p) => p.classItem);
  const heldOtherDays = parsed.length - today.length - unscheduled.length;

  const date = format(now, 'yyyy-MM-dd');
  const rosters = await Promise.all(today.map((p) => attendanceService.getClassDailyRoster(p.classItem.id, date)));

  const scheduled: TodayClass[] = today
    .map((p, index) => {
      const roster = rosters[index];
      return {
        classItem: p.classItem,
        timeLabel: p.schedule.timeLabel,
        startMinutes: p.schedule.startMinutes,
        students: roster.totalStudents,
        counts: {
          present: roster.presentCount,
          absent: roster.absentCount,
          late: roster.lateCount,
          leave: roster.earlyLeaveCount,
          unmarked: roster.unmarkedCount,
        },
      };
    })
    .sort(
      (a, b) =>
        (a.startMinutes ?? Number.MAX_SAFE_INTEGER) - (b.startMinutes ?? Number.MAX_SAFE_INTEGER) ||
        a.classItem.name.localeCompare(b.classItem.name, 'ko'),
    );

  const totals = scheduled.reduce(
    (sum, c) => ({
      present: sum.present + c.counts.present,
      absent: sum.absent + c.counts.absent,
      late: sum.late + c.counts.late,
      leave: sum.leave + c.counts.leave,
      unmarked: sum.unmarked + c.counts.unmarked,
      students: sum.students + c.students,
    }),
    { ...EMPTY_COUNTS, students: 0 },
  );

  return { date, scheduled, unscheduled, heldOtherDays, totals };
}

export function useTodayBoard(user: UserProfile | null) {
  const now = new Date();
  const date = format(now, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['today-board', user?.id, user?.role, date],
    queryFn: () => loadTodayBoard(user as UserProfile, now),
    enabled: user !== null,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
