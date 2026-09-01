export type EventCategory =
  | 'ACADEMY'       // 학원 공식 행사 / 설명회
  | 'EXAM'          // 정기/모의고사 / 학교 시험대비
  | 'SPECIAL'       // 특강 / 보강
  | 'HOLIDAY'       // 공휴일 / 정기 휴원
  | 'CONSULTATION'  // 학부모 상담 주간
  | 'OTHER';        // 기타

export type EventColor = 'indigo' | 'purple' | 'rose' | 'amber' | 'emerald' | 'blue' | 'slate';

export interface AcademyEvent {
  id: string;
  academyId: number;
  title: string;
  category: EventCategory;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  description?: string;
  targetClassIds?: number[];
  color: EventColor;
  createdBy?: string;
  createdAt: string;
}

export interface DayClassSchedule {
  classId: number;
  className: string;
  subject?: string | null;
  teacherName?: string | null;
  startTime: string; // e.g. "16:00"
  endTime: string;   // e.g. "18:00"
  room?: string | null;
  studentCount: number;
  days: string[]; // e.g. ["월", "수", "금"]
}

export const EVENT_CATEGORY_META: Record<
  EventCategory,
  { label: string; defaultColor: EventColor; badgeClass: string }
> = {
  ACADEMY: {
    label: '학원 행사/설명회',
    defaultColor: 'indigo',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  EXAM: {
    label: '시험/모의고사',
    defaultColor: 'purple',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  SPECIAL: {
    label: '특강/보강',
    defaultColor: 'blue',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  HOLIDAY: {
    label: '휴원일/공휴일',
    defaultColor: 'rose',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  CONSULTATION: {
    label: '학부모 상담 주간',
    defaultColor: 'emerald',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  OTHER: {
    label: '기타 일정',
    defaultColor: 'slate',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
};

export const COLOR_CLASSES: Record<EventColor, { bg: string; text: string; border: string; dot: string }> = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/70',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    dot: 'bg-indigo-500',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/70',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/70',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/70',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/70',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/70',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
  },
};

// Initial default seed events for realistic demo experience
const getInitialEvents = (academyId: number): AcademyEvent[] => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const nextMonth = String(today.getMonth() + 2 > 12 ? 1 : today.getMonth() + 2).padStart(2, '0');
  const nextYear = today.getMonth() + 2 > 12 ? year + 1 : year;

  return [
    {
      id: 'evt-1',
      academyId,
      title: '2학기 중간고사 집중 대비 특강',
      category: 'EXAM',
      startDate: `${year}-${month}-15`,
      endDate: `${year}-${month}-28`,
      description: '중등/고등 전 학년 교과서별 기출문제 풀이 및 주말 클리닉 운영',
      color: 'purple',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'evt-2',
      academyId,
      title: '학부모 1:1 진로·입시 상담 주간',
      category: 'CONSULTATION',
      startDate: `${year}-${month}-08`,
      endDate: `${year}-${month}-12`,
      startTime: '14:00',
      endTime: '21:00',
      description: '1학기 학업 성취도 분석표 기반 개별 맞춤 상담',
      color: 'emerald',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'evt-3',
      academyId,
      title: '학원 정기 개원기념일 (휴원)',
      category: 'HOLIDAY',
      startDate: `${year}-${month}-21`,
      description: '전체 정규 수업 휴강 및 시설 정비',
      color: 'rose',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'evt-4',
      academyId,
      title: '2027 대입 개편 설명회 (대강당)',
      category: 'ACADEMY',
      startDate: `${nextYear}-${nextMonth}-05`,
      startTime: '19:30',
      endTime: '21:30',
      description: '예비 고1 학부모 대상 변화된 수능 및 내신 체계 분석',
      color: 'indigo',
      createdAt: new Date().toISOString(),
    },
  ];
};

export const calendarService = {
  // Get all events for an academy
  async getEvents(academyId: number): Promise<AcademyEvent[]> {
    if (typeof window === 'undefined') return [];
    const storageKey = `classhelper_events_${academyId}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      const initial = getInitialEvents(academyId);
      localStorage.setItem(storageKey, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  // Add new event
  async createEvent(
    academyId: number,
    event: Omit<AcademyEvent, 'id' | 'academyId' | 'createdAt'>,
  ): Promise<AcademyEvent> {
    const events = await this.getEvents(academyId);
    const newEvent: AcademyEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      academyId,
      createdAt: new Date().toISOString(),
    };
    const updated = [...events, newEvent];
    localStorage.setItem(`classhelper_events_${academyId}`, JSON.stringify(updated));
    return newEvent;
  },

  // Update existing event
  async updateEvent(
    academyId: number,
    eventId: string,
    updateData: Partial<Omit<AcademyEvent, 'id' | 'academyId'>>,
  ): Promise<AcademyEvent> {
    const events = await this.getEvents(academyId);
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) throw new Error('이벤트를 찾을 수 없습니다.');

    events[index] = { ...events[index], ...updateData };
    localStorage.setItem(`classhelper_events_${academyId}`, JSON.stringify(events));
    return events[index];
  },

  // Delete event
  async deleteEvent(academyId: number, eventId: string): Promise<void> {
    const events = await this.getEvents(academyId);
    const filtered = events.filter((e) => e.id !== eventId);
    localStorage.setItem(`classhelper_events_${academyId}`, JSON.stringify(filtered));
  },
};
