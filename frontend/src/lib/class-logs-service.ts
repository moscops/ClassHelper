import { api } from './api';

export type HomeworkStatus = 'COMPLETED' | 'INCOMPLETE' | 'NOT_SUBMITTED' | 'EXCUSED';

export interface HomeworkStudentSummary {
  id: number;
  name: string;
  grade?: string | null;
  studentPhone?: string | null;
  parentPhone: string;
  parentName?: string | null;
}

export interface HomeworkSubmissionItem {
  id: number;
  classLogId: number;
  studentId: number;
  status: HomeworkStatus;
  score?: number | null;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: HomeworkStudentSummary;
}

export interface ClassLogClassSummary {
  id: number;
  name: string;
  subject?: string | null;
  targetGrade?: string | null;
  schedule?: string | null;
}

export interface ClassLogTeacherSummary {
  id: number;
  name: string;
  email: string;
}

export interface ClassLogItem {
  id: number;
  academyId: number;
  classId: number;
  teacherId: number;
  date: string;
  curriculum: string;
  lessonContent?: string | null;
  homework?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  class?: ClassLogClassSummary;
  teacher?: ClassLogTeacherSummary;
  homeworkSubmissions?: HomeworkSubmissionItem[];
  totalStudents?: number;
  completedCount?: number;
  incompleteCount?: number;
  notSubmittedCount?: number;
  excusedCount?: number;
  completionRate?: number;
  averageScore?: number;
}

export interface PaginatedClassLogs {
  items: ClassLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryClassLogsParams {
  classId?: number;
  teacherId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateClassLogPayload {
  classId: number;
  date: string;
  curriculum: string;
  lessonContent?: string;
  homework?: string;
  notes?: string;
  submissions?: {
    studentId: number;
    status?: HomeworkStatus;
    score?: number;
    feedback?: string;
  }[];
}

export interface UpdateClassLogPayload {
  classId?: number;
  date?: string;
  curriculum?: string;
  lessonContent?: string;
  homework?: string;
  notes?: string;
}

export interface BatchUpdateHomeworkPayload {
  submissions: {
    studentId: number;
    status: HomeworkStatus;
    score?: number;
    feedback?: string;
  }[];
}

export interface StudentHomeworkHistoryItem {
  id: number;
  classLogId: number;
  date: string;
  className: string;
  teacherName: string;
  curriculum: string;
  homework?: string | null;
  status: HomeworkStatus;
  score?: number | null;
  feedback?: string | null;
}

export interface StudentHomeworkHistoryResponse {
  studentId: number;
  studentName: string;
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  averageScore?: number | null;
  history: StudentHomeworkHistoryItem[];
}

export const classLogsService = {
  // 수업 일지 목록 조회
  async getClassLogs(params?: QueryClassLogsParams): Promise<PaginatedClassLogs> {
    const response = await api.get<PaginatedClassLogs>('/class-logs', { params });
    return response.data;
  },

  // 특정 수업 일지 상세 조회
  async getClassLog(id: number): Promise<ClassLogItem> {
    const response = await api.get<ClassLogItem>(`/class-logs/${id}`);
    return response.data;
  },

  // 수업 일지 신규 작성
  async createClassLog(payload: CreateClassLogPayload): Promise<ClassLogItem> {
    const response = await api.post<ClassLogItem>('/class-logs', payload);
    return response.data;
  },

  // 수업 일지 수정
  async updateClassLog(id: number, payload: UpdateClassLogPayload): Promise<ClassLogItem> {
    const response = await api.patch<ClassLogItem>(`/class-logs/${id}`, payload);
    return response.data;
  },

  // 수업 일지 삭제
  async deleteClassLog(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/class-logs/${id}`);
    return response.data;
  },

  // 학생별 과제 검사 및 피드백 일괄 수정
  async updateHomeworkSubmissions(
    id: number,
    payload: BatchUpdateHomeworkPayload,
  ): Promise<ClassLogItem> {
    const response = await api.patch<ClassLogItem>(
      `/class-logs/${id}/homework-submissions`,
      payload,
    );
    return response.data;
  },

  // 특정 학생의 누적 과제 히스토리 조회 (학부모 상담용 리포트)
  async getStudentHomeworkHistory(studentId: number): Promise<StudentHomeworkHistoryResponse> {
    const response = await api.get<StudentHomeworkHistoryResponse>(
      `/class-logs/student/${studentId}/history`,
    );
    return response.data;
  },
};
