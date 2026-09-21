import { api } from './api';

export type EventCategory =
  | 'ACADEMY'       // 학원 공식 행사 / 설명회
  | 'EXAM'          // 정기/모의고사 / 학교 시험대비
  | 'SPECIAL'       // 특강 / 보강
  | 'HOLIDAY'       // 공휴일 / 정기 휴원
  | 'CONSULTATION'  // 학부모 상담 주간
  | 'OTHER';        // 기타

export type EventColor = 'INDIGO' | 'PURPLE' | 'ROSE' | 'AMBER' | 'EMERALD' | 'BLUE' | 'SLATE';

export interface AcademyEvent {
  id: number;
  academyId: number;
  title: string;
  category: EventCategory;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;   // YYYY-MM-DD
  startTime?: string | null; // HH:mm
  endTime?: string | null;   // HH:mm
  description?: string | null;
  color: EventColor;
  createdAt: string;
  updatedAt: string;
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
    defaultColor: 'INDIGO',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  EXAM: {
    label: '시험/모의고사',
    defaultColor: 'PURPLE',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  SPECIAL: {
    label: '특강/보강',
    defaultColor: 'BLUE',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  HOLIDAY: {
    label: '휴원일/공휴일',
    defaultColor: 'ROSE',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  CONSULTATION: {
    label: '학부모 상담 주간',
    defaultColor: 'EMERALD',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  OTHER: {
    label: '기타 일정',
    defaultColor: 'SLATE',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
};

export const COLOR_CLASSES: Record<EventColor, { bg: string; text: string; border: string; dot: string }> = {
  INDIGO: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/70',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    dot: 'bg-indigo-500',
  },
  PURPLE: {
    bg: 'bg-purple-50 dark:bg-purple-950/70',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
  },
  ROSE: {
    bg: 'bg-rose-50 dark:bg-rose-950/70',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500',
  },
  AMBER: {
    bg: 'bg-amber-50 dark:bg-amber-950/70',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  EMERALD: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/70',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  BLUE: {
    bg: 'bg-blue-50 dark:bg-blue-950/70',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  },
  SLATE: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
  },
};

export interface CreateEventDto {
  title: string;
  category: EventCategory;
  color?: EventColor;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
}

export type UpdateEventDto = Partial<CreateEventDto>;

export const calendarService = {
  // 학원 이벤트 목록 조회 (academyId는 인증 토큰 기반으로 백엔드에서 판별되므로 요청에는 실리지 않음)
  async getEvents(academyId: number): Promise<AcademyEvent[]> {
    void academyId;
    const response = await api.get<AcademyEvent[]>('/calendar/events');
    return response.data;
  },

  // 학원 이벤트 생성
  async createEvent(academyId: number, event: CreateEventDto): Promise<AcademyEvent> {
    void academyId;
    const response = await api.post<AcademyEvent>('/calendar/events', event);
    return response.data;
  },

  // 학원 이벤트 수정
  async updateEvent(
    academyId: number,
    eventId: number,
    updateData: UpdateEventDto,
  ): Promise<AcademyEvent> {
    void academyId;
    const response = await api.patch<AcademyEvent>(`/calendar/events/${eventId}`, updateData);
    return response.data;
  },

  // 학원 이벤트 삭제
  async deleteEvent(academyId: number, eventId: number): Promise<void> {
    void academyId;
    await api.delete(`/calendar/events/${eventId}`);
  },
};
