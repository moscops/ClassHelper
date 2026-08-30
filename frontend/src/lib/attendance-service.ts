import { api } from './api';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE';
export type QuickCheckType = 'CHECK_IN' | 'CHECK_OUT';

export interface AttendanceStudentSummary {
  id: number;
  name: string;
  grade?: string | null;
  studentPhone?: string | null;
  parentPhone: string;
  parentName?: string | null;
}

export interface AttendanceClassSummary {
  id: number;
  name: string;
  subject?: string | null;
  schedule?: string | null;
}

export interface AttendanceItem {
  id: number;
  academyId: number;
  studentId: number;
  classId: number;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  reason?: string | null;
  isMakeupNeeded: boolean;
  isMakeupCompleted: boolean;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: AttendanceStudentSummary;
  class?: AttendanceClassSummary;
}

export interface ClassRosterStudent {
  studentId: number;
  studentName: string;
  grade?: string | null;
  studentPhone?: string | null;
  parentPhone: string;
  parentName?: string | null;
  attendance?: AttendanceItem | null;
}

export interface ClassDailyRoster {
  class: AttendanceClassSummary;
  date: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  unmarkedCount: number;
  students: ClassRosterStudent[];
}

export interface DailyAttendanceStat {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  attendanceRate: number;
}

export interface AttendanceStats {
  startDate: string;
  endDate: string;
  totalRecords: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalEarlyLeave: number;
  averageAttendanceRate: number;
  makeupNeededCount: number;
  makeupCompletedCount: number;
  dailyStats: DailyAttendanceStat[];
}

export interface PaginatedAttendanceResponse {
  data: AttendanceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecordAttendanceInput {
  studentId: number;
  classId: number;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  reason?: string;
  isMakeupNeeded?: boolean;
  isMakeupCompleted?: boolean;
  memo?: string;
}

export interface BatchAttendanceItemInput {
  studentId: number;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  reason?: string;
  isMakeupNeeded?: boolean;
  memo?: string;
}

export interface BatchAttendanceInput {
  classId: number;
  date: string;
  records: BatchAttendanceItemInput[];
}

export interface QuickCheckInput {
  studentId: number;
  classId: number;
  type: QuickCheckType;
  date?: string;
  time?: string;
}

export interface QueryAttendanceParams {
  classId?: number;
  studentId?: number;
  studentName?: string;
  status?: AttendanceStatus;
  startDate?: string;
  endDate?: string;
  date?: string;
  isMakeupNeeded?: boolean;
  isMakeupCompleted?: boolean;
  page?: number;
  limit?: number;
}

export interface AttendanceStatsParams {
  classId?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateMakeupInput {
  isMakeupNeeded: boolean;
  isMakeupCompleted?: boolean;
  memo?: string;
}

export const attendanceService = {
  /**
   * 단일 출결 등록 / 수정 (Upsert)
   */
  async recordAttendance(data: RecordAttendanceInput): Promise<AttendanceItem> {
    const response = await api.post<AttendanceItem>('/attendance/record', data);
    return response.data;
  },

  /**
   * 반 전체 1초 일괄 출결 체크 (Batch Upsert)
   */
  async batchRecordAttendance(data: BatchAttendanceInput): Promise<AttendanceItem[]> {
    const response = await api.post<AttendanceItem[]>('/attendance/batch', data);
    return response.data;
  },

  /**
   * 1초 원터치 빠른 등원/하원 체크
   */
  async quickCheck(data: QuickCheckInput): Promise<AttendanceItem> {
    const response = await api.post<AttendanceItem>('/attendance/quick-check', data);
    return response.data;
  },

  /**
   * 특정 반 및 특정 일자의 전체 수강생 일별 출결 현황판
   */
  async getClassDailyRoster(classId: number, date?: string): Promise<ClassDailyRoster> {
    const params = new URLSearchParams();
    params.append('classId', classId.toString());
    if (date) {
      params.append('date', date);
    }
    const response = await api.get<ClassDailyRoster>(`/attendance/roster?${params.toString()}`);
    return response.data;
  },

  /**
   * 출결 내역 다차원 검색 및 페이지네이션
   */
  async getAttendances(params?: QueryAttendanceParams): Promise<PaginatedAttendanceResponse> {
    const query = new URLSearchParams();
    if (params) {
      if (params.classId) query.append('classId', params.classId.toString());
      if (params.studentId) query.append('studentId', params.studentId.toString());
      if (params.studentName) query.append('studentName', params.studentName);
      if (params.status) query.append('status', params.status);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.date) query.append('date', params.date);
      if (params.isMakeupNeeded !== undefined) query.append('isMakeupNeeded', params.isMakeupNeeded.toString());
      if (params.isMakeupCompleted !== undefined) query.append('isMakeupCompleted', params.isMakeupCompleted.toString());
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
    }
    const response = await api.get<PaginatedAttendanceResponse>(`/attendance?${query.toString()}`);
    return response.data;
  },

  /**
   * 출결 통계 및 요약 분석
   */
  async getStats(params?: AttendanceStatsParams): Promise<AttendanceStats> {
    const query = new URLSearchParams();
    if (params) {
      if (params.classId) query.append('classId', params.classId.toString());
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
    }
    const response = await api.get<AttendanceStats>(`/attendance/stats?${query.toString()}`);
    return response.data;
  },

  /**
   * 보강 수업 대상 지정 및 완료 처리
   */
  async updateMakeup(attendanceId: number, data: UpdateMakeupInput): Promise<AttendanceItem> {
    const response = await api.patch<AttendanceItem>(`/attendance/${attendanceId}/makeup`, data);
    return response.data;
  },

  /**
   * 출결 기록 삭제
   */
  async deleteAttendance(attendanceId: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(`/attendance/${attendanceId}`);
    return response.data;
  },

  /**
   * 오늘 미등원 학생 감지 및 경고 상태 조회 (출결 버튼 신호 연동)
   */
  async getUnattendedStatus(date?: string): Promise<UnattendedStatusResponse> {
    const query = date ? `?date=${date}` : '';
    const response = await api.get<UnattendedStatusResponse>(`/attendance/unattended-status${query}`);
    return response.data;
  },

  /**
   * 미등원 학생 학부모 대상 카카오 안심 알림톡 일괄 자동 발송
   */
  async triggerUnattendedAlerts(date?: string): Promise<{ sentCount: number; message: string; results: any[] }> {
    const query = date ? `?date=${date}` : '';
    const response = await api.post<{ sentCount: number; message: string; results: any[] }>(
      `/attendance/trigger-unattended-alerts${query}`,
      {},
    );
    return response.data;
  },
};

export interface UnattendedStudent {
  studentId: number;
  studentName: string;
  grade?: string | null;
  parentPhone: string;
  studentPhone?: string | null;
  classId: number;
  className: string;
  schedule?: string | null;
  isAlertSent: boolean;
  alertSentAt?: string | null;
}

export interface UnattendedStatusResponse {
  isUnattendedAlertActive: boolean;
  unattendedCount: number;
  unattendedStudents: UnattendedStudent[];
}

