'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTodayBoard, type TodayClass } from '@/lib/today-board';
import { AttendanceBar, StatusLegend } from '@/components/dashboard/AttendanceBar';

const VISIBLE_ROWS = 12;

function ClassRow({ item, index }: { item: TodayClass; index: number }) {
  const { classItem, counts, students, timeLabel } = item;
  const allMarked = students > 0 && counts.unmarked === 0;

  return (
    <li>
      <Link
        href={`/attendance?class=${classItem.id}`}
        className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] md:grid-cols-[4.5rem_minmax(0,1fr)_minmax(10rem,18rem)_10rem] gap-x-3 md:gap-x-6 gap-y-2 md:items-center px-3 py-4 -mx-3 rounded-lg transition-ui hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200/70 dark:active:bg-slate-800"
      >
        <span
          className={`col-start-1 row-start-1 tabular-nums ${
            timeLabel
              ? 'text-sm font-semibold text-slate-900 dark:text-white'
              : 'text-xs text-slate-500 dark:text-slate-400'
          }`}
        >
          {timeLabel ?? '시간 미정'}
        </span>

        <span className="col-start-2 row-start-1 min-w-0">
          <span className="block truncate text-base font-semibold text-slate-900 dark:text-white">
            {classItem.name}
          </span>
          <span className="block truncate text-sm text-slate-600 dark:text-slate-400">
            {classItem.teacher?.name ? `${classItem.teacher.name} 강사 · ` : ''}
            {students}명
          </span>
        </span>

        <span className="col-start-2 col-span-2 row-start-2 md:col-span-1 md:col-start-3 md:row-start-1">
          <AttendanceBar counts={counts} revealDelayMs={Math.min(index, 6) * 50} />
        </span>

        <span className="col-start-3 row-start-1 md:col-start-4 flex items-center justify-end text-sm">
          {students === 0 ? (
            <span className="text-slate-500 dark:text-slate-400">수강생 없음</span>
          ) : allMarked ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-status-present">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              출결 완료
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
              미체크 {counts.unmarked}명
              <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

function BoardSkeleton() {
  return (
    <div aria-busy="true" className="space-y-8">
      <span className="sr-only" role="status">
        오늘 수업을 불러오는 중입니다.
      </span>
      <div className="space-y-4">
        <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse" />
        <div className="h-3.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse" />
        <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-14 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export function TodayBoard() {
  const { user } = useAuthStore();
  const { data: board, isLoading, isError, refetch } = useTodayBoard(user);
  const [showAll, setShowAll] = useState(false);
  const isTeacher = user?.role === 'TEACHER';

  if (isLoading) return <BoardSkeleton />;

  if (isError || !board) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-status-absent/40 bg-status-absent-soft p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <p className="text-sm text-status-absent">
          오늘 수업을 불러오지 못했습니다. 네트워크 연결을 확인하고 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const { scheduled, unscheduled, heldOtherDays, totals } = board;
  const classCount = scheduled.length + unscheduled.length + heldOtherDays;
  const rows = showAll ? scheduled : scheduled.slice(0, VISIBLE_ROWS);

  return (
    <div className="space-y-10">
      {scheduled.length > 0 && (
        <section aria-labelledby="overall-title" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="overall-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {isTeacher ? '오늘 내 수업 현황' : '오늘 출결 현황'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              수업 {scheduled.length}개 · 수강생 {totals.students}명
            </p>
          </div>
          <AttendanceBar counts={totals} heightClass="h-3.5" />
          <StatusLegend counts={totals} />
        </section>
      )}

      <section aria-labelledby="classes-title">
        <h2 id="classes-title" className="text-lg font-bold text-slate-900 dark:text-white">
          {isTeacher ? '오늘 내 수업' : '오늘 수업'}
        </h2>

        {scheduled.length > 0 ? (
          <>
            <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
              {rows.map((item, index) => (
                <ClassRow key={item.classItem.id} item={item} index={index} />
              ))}
            </ul>
            {scheduled.length > rows.length && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mt-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 underline underline-offset-4 cursor-pointer"
              >
                나머지 {scheduled.length - rows.length}개 수업 보기
              </button>
            )}
          </>
        ) : (
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-400 space-y-1.5">
            {classCount === 0 ? (
              isTeacher ? (
                <p>담당으로 지정된 반이 없습니다. 원장님께 반 배정을 요청해 주세요.</p>
              ) : (
                <p>
                  운영 중인 반이 없습니다.{' '}
                  <Link href="/classes" className="font-medium text-indigo-700 dark:text-indigo-300 underline underline-offset-4">
                    반 만들기
                  </Link>
                </p>
              )
            ) : (
              <>
                <p>오늘은 예정된 수업이 없습니다.</p>
                {heldOtherDays > 0 && <p>다른 요일에 진행하는 반이 {heldOtherDays}개 있습니다.</p>}
              </>
            )}
          </div>
        )}

        {unscheduled.length > 0 && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            <Link
              href={isTeacher ? '/attendance' : '/classes'}
              className="font-medium text-indigo-700 dark:text-indigo-300 underline underline-offset-4"
            >
              수업 요일을 읽을 수 없는 반 {unscheduled.length}개
            </Link>
            {isTeacher
              ? '는 여기에 나타나지 않습니다. 원장님께 시간표에 요일을 적어 달라고 요청해 주세요.'
              : '는 여기에 나타나지 않습니다. 반의 시간표에 요일(예: 월/수/금 17:30)을 적어 주세요.'}
          </p>
        )}
      </section>
    </div>
  );
}
