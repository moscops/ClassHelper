import React from 'react';
import type { StatusCounts } from '@/lib/today-board';

// The product's own vocabulary: 출석 / 지각 / 조퇴 / 결석 / 미체크, each with its own color.
// Color never carries the meaning alone; the label and the count are always written out.
export const STATUS_META = [
  { key: 'present', label: '출석', text: 'text-status-present', solid: 'bg-status-present-solid' },
  { key: 'late', label: '지각', text: 'text-status-late', solid: 'bg-status-late-solid' },
  { key: 'leave', label: '조퇴', text: 'text-status-leave', solid: 'bg-status-leave-solid' },
  { key: 'absent', label: '결석', text: 'text-status-absent', solid: 'bg-status-absent-solid' },
  { key: 'unmarked', label: '미체크', text: 'text-status-unmarked', solid: 'bg-status-unmarked-solid' },
] as const;

const describe = (counts: StatusCounts) =>
  STATUS_META.map((s) => `${s.label} ${counts[s.key]}명`).join(', ');

interface AttendanceBarProps {
  counts: StatusCounts;
  /** Tailwind height class, e.g. "h-2". */
  heightClass?: string;
  /** Stagger for the one-time unfold animation. */
  revealDelayMs?: number;
}

export function AttendanceBar({ counts, heightClass = 'h-2', revealDelayMs = 0 }: AttendanceBarProps) {
  return (
    <div
      role="img"
      aria-label={describe(counts)}
      className={`reveal-x flex w-full gap-px overflow-hidden rounded-full bg-status-unmarked-soft ${heightClass}`}
      style={{ '--reveal-delay': `${revealDelayMs}ms` } as React.CSSProperties}
    >
      {STATUS_META.map((s) =>
        counts[s.key] > 0 ? (
          <span key={s.key} className={s.solid} style={{ flexGrow: counts[s.key], flexBasis: 0 }} />
        ) : null,
      )}
    </div>
  );
}

export function StatusLegend({ counts }: { counts: StatusCounts }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {STATUS_META.map((s) => (
        <div key={s.key} className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${s.solid}`} />
          <dt className="text-sm text-slate-600 dark:text-slate-400">{s.label}</dt>
          <dd className={`text-sm font-bold tabular-nums ${s.text}`}>{counts[s.key]}</dd>
        </div>
      ))}
    </dl>
  );
}
