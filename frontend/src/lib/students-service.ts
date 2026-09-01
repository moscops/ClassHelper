import { api } from './api';

export type StudentStatus = 'ACTIVE' | 'ON_LEAVE' | 'DISCHARGED';
export type Gender = 'MALE' | 'FEMALE';

export interface EnrolledClassBadge {
  id: number;
  name: string;
  subject?: string | null;
}

export interface StudentItem {
  id: number;
  academyId: number;
  name: string;
  gender?: Gender | null;
  birthDate?: string | null;
  schoolName?: string | null;
  grade?: string | null;
  studentPhone?: string | null;
  parentPhone: string;
  parentName?: string | null;
  parentRelationship?: string | null;
  status: StudentStatus;
  enrolledAt?: string | null;
  dischargedAt?: string | null;
  memo?: string | null;
  createdAt: string;
  enrolledClasses?: EnrolledClassBadge[];
}

export interface StudentClassSummary {
  enrollmentId: number;
  classId: number;
  className: string;
  subject?: string | null;
  teacherName?: string | null;
  status: 'ENROLLED' | 'COMPLETED' | 'DROPPED' | 'PAUSED';
  startDate: string;
}

export interface StudentDetailItem extends StudentItem {
  classes: StudentClassSummary[];
}

export interface CreateStudentDto {
  name: string;
  gender?: Gender;
  birthDate?: string;
  schoolName?: string;
  grade?: string;
  studentPhone?: string;
  parentPhone: string;
  parentName?: string;
  parentRelationship?: string;
  status?: StudentStatus;
  enrolledAt?: string;
  memo?: string;
}

export interface UpdateStudentDto {
  name?: string;
  gender?: Gender;
  birthDate?: string;
  schoolName?: string;
  grade?: string;
  studentPhone?: string;
  parentPhone?: string;
  parentName?: string;
  parentRelationship?: string;
  enrolledAt?: string;
  dischargedAt?: string;
  memo?: string;
}

export interface UpdateStudentStatusDto {
  status: StudentStatus;
  dischargedAt?: string;
}

export interface PaginatedStudentsResponse {
  items: StudentItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const studentsService = {
  async getStudents(params?: {
    search?: string;
    status?: string;
    grade?: string;
    classId?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedStudentsResponse> {
    const response = await api.get<PaginatedStudentsResponse>('/students', { params });
    return response.data;
  },

  async getStudent(id: number): Promise<StudentDetailItem> {
    const response = await api.get<StudentDetailItem>(`/students/${id}`);
    return response.data;
  },

  async createStudent(dto: CreateStudentDto): Promise<StudentItem> {
    const response = await api.post<StudentItem>('/students', dto);
    return response.data;
  },

  async updateStudent(id: number, dto: UpdateStudentDto): Promise<StudentItem> {
    const response = await api.patch<StudentItem>(`/students/${id}`, dto);
    return response.data;
  },

  async updateStudentStatus(id: number, dto: UpdateStudentStatusDto): Promise<StudentItem> {
    const response = await api.patch<StudentItem>(`/students/${id}/status`, dto);
    return response.data;
  },

  async deleteStudent(id: number): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(`/students/${id}`);
    return response.data;
  },

  /**
   * 원생 CSV 일괄 등록 템플릿 파일 다운로드
   */
  async downloadBulkImportTemplate(): Promise<Blob> {
    const response = await api.get('/students/bulk-import/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * 원생 CSV 파일 일괄 등록 업로드
   */
  async bulkImportStudents(file: File): Promise<BulkImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<BulkImportResult>('/students/bulk-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export interface BulkImportSkippedItem {
  row: number;
  name: string;
  reason: string;
}

export interface BulkImportFailedItem {
  row: number;
  name?: string;
  errors: string[];
}

export interface BulkImportResult {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  created: StudentItem[];
  skipped: BulkImportSkippedItem[];
  failed: BulkImportFailedItem[];
}
