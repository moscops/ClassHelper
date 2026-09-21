// Reads the weekdays and start time out of a class's free-text schedule ("월/수/금 17:30").
// The backend keeps `schedule` as plain text, so this is a best-effort reading: when no
// weekday can be found the class is reported as `days: null` instead of guessing.

export interface ParsedSchedule {
  /** JS weekday numbers (0 = 일 … 6 = 토); null when the text names no weekday. */
  days: number[] | null;
  /** Minutes after midnight for the first time in the text; null when there is none. */
  startMinutes: number | null;
  /** "17:30" for display; null when there is no time. */
  timeLabel: string | null;
}

const DAY_ORDER = '월화수목금토일'; // Monday-first, the order people write ranges in
const DAY_TO_JS: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [6, 0];

function readTime(text: string): { startMinutes: number; timeLabel: string; rest: string } | null {
  const match = text.match(/(\d{1,2})\s*(?::|시)\s*(\d{2})?/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour > 23 || minute > 59) return null;
  return {
    startMinutes: hour * 60 + minute,
    timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    rest: text.replace(match[0], ' '),
  };
}

function expandRanges(text: string): string {
  return text.replace(/([월화수목금토일])\s*[~\-–]\s*([월화수목금토일])/g, (_, from: string, to: string) => {
    const start = DAY_ORDER.indexOf(from);
    const days: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const day = DAY_ORDER[(start + i) % 7];
      days.push(day);
      if (day === to) break;
    }
    return days.join(',');
  });
}

function readDays(text: string): number[] | null {
  const cleaned = expandRanges(text.replace(/요일/g, ''));
  const found = new Set<number>();

  if (cleaned.includes('매일')) return [0, 1, 2, 3, 4, 5, 6];
  if (cleaned.includes('평일')) WEEKDAYS.forEach((d) => found.add(d));
  if (cleaned.includes('주말')) WEEKEND.forEach((d) => found.add(d));

  // Only tokens made purely of weekday letters count, so "수학" is not read as 수요일.
  for (const token of cleaned.split(/[^가-힣]+/)) {
    if (token && [...token].every((ch) => ch in DAY_TO_JS)) {
      [...token].forEach((ch) => found.add(DAY_TO_JS[ch]));
    }
  }

  return found.size > 0 ? [...found].sort((a, b) => a - b) : null;
}

export function parseSchedule(text?: string | null): ParsedSchedule {
  const raw = (text ?? '').trim();
  if (!raw) return { days: null, startMinutes: null, timeLabel: null };
  const time = readTime(raw);
  return {
    days: readDays(time ? time.rest : raw),
    startMinutes: time ? time.startMinutes : null,
    timeLabel: time ? time.timeLabel : null,
  };
}
