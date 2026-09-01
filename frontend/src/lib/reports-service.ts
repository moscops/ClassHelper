import { api } from './api';

export interface AttendanceStats {
  totalDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  attendanceRate: number;
}

export interface HomeworkStats {
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  averageScore: number | null;
}

export interface StudentReport {
  studentId: number;
  studentName: string;
  periodStart: string;
  periodEnd: string;
  attendance: AttendanceStats;
  homework: HomeworkStats;
  message: string;
}

export interface SendReportResult extends StudentReport {
  sentTo: string;
  notificationId: number;
}

export interface ClassReportFailure {
  studentId: number;
  studentName: string;
  reason: string;
}

export interface ClassReportSendResult {
  classId: number;
  className: string;
  periodStart: string;
  periodEnd: string;
  totalStudents: number;
  sentCount: number;
  failedCount: number;
  results: SendReportResult[];
  failed: ClassReportFailure[];
}

export const reportsService = {
  /**
   * 원생 리포트 미리보기 (발송 안 함)
   */
  async previewStudentReport(
    studentId: number,
    periodStart: string,
    periodEnd: string,
  ): Promise<StudentReport> {
    const response = await api.get<StudentReport>(`/reports/students/${studentId}`, {
      params: { periodStart, periodEnd },
    });
    return response.data;
  },

  /**
   * 원생 1명 리포트 생성 및 카카오 발송
   */
  async sendStudentReport(
    studentId: number,
    periodStart: string,
    periodEnd: string,
  ): Promise<SendReportResult> {
    const response = await api.post<SendReportResult>(`/reports/students/${studentId}/send`, {
      periodStart,
      periodEnd,
    });
    return response.data;
  },

  /**
   * 반 전체 재원생 리포트 일괄 발송
   */
  async sendClassReports(
    classId: number,
    periodStart: string,
    periodEnd: string,
  ): Promise<ClassReportSendResult> {
    const response = await api.post<ClassReportSendResult>(`/reports/classes/${classId}/send`, {
      periodStart,
      periodEnd,
    });
    return response.data;
  },
};
