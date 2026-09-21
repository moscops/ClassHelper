import { api } from './api';
import {
  StaffMember,
  CreateStaffInput,
  UpdateStaffInput,
  StaffRegisteredResult,
  JoinStaffInput,
  StaffJoinCodeResponse,
  StaffStats,
} from '@/types/staff';
import { AuthResponse } from '@/types/auth';
import { classesService } from './classes-service';

export const staffService = {
  /**
   * 학원 내 전체 교직원 목록 조회 (담당 수업 반 매핑 포함)
   * @param includeInactive 퇴사자 포함 여부 (기본: false)
   */
  getStaffList: async (includeInactive = false): Promise<StaffMember[]> => {
    // 1. 실제 백엔드 GET /auth/staff 호출
    const response = await api.get<StaffMember[]>('/auth/staff', {
      params: { includeInactive: includeInactive ? 'true' : 'false' },
    });
    const staffList: StaffMember[] = Array.isArray(response.data) ? response.data : [];

    // 2. 담당 수업 반 정보 병합 (수업 관리 도메인 연계)
    try {
      const classesRes = await classesService.getClasses({ limit: 100 });
      const classItems = classesRes.items || [];

      staffList.forEach((staff) => {
        const taught = classItems
          .filter((cls) => cls.teacherId === staff.id)
          .map((cls) => ({
            id: cls.id,
            name: cls.name,
            subject: cls.subject,
            targetGrade: cls.targetGrade,
            schedule: cls.schedule,
            capacity: cls.capacity,
            monthlyFee: cls.monthlyFee,
            enrolledCount: cls.enrolledCount,
            status: cls.status,
          }));
        staff.taughtClasses = taught;
        if (!staff.taughtClassesCount) {
          staff.taughtClassesCount = taught.length;
        }
      });
    } catch {
      // 수업 정보 로드 실패 시에도 교직원 기본 목록은 정상 반환
    }

    // 3. 직책 순 정렬: OWNER -> ADMIN -> TEACHER -> STAFF
    const rolePriority: Record<string, number> = {
      OWNER: 1,
      ADMIN: 2,
      TEACHER: 3,
      STAFF: 4,
    };
    return staffList.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
  },

  /**
   * 신규 교직원 직접 등록 (원장/관리자 전용)
   */
  createStaff: async (input: CreateStaffInput): Promise<StaffRegisteredResult> => {
    const payload: Record<string, any> = {
      email: input.email.trim(),
      name: input.name.trim(),
      role: input.role,
    };
    if (input.phone && input.phone.trim()) {
      payload.phone = input.phone.trim();
    }
    if (input.password && input.password.trim()) {
      payload.password = input.password.trim();
    }

    const res = await api.post<StaffRegisteredResult>('/auth/register-staff', payload);
    return res.data;
  },

  /**
   * 교직원 정보 및 직책 수정 (원장/관리자 전용)
   * 원장 계정은 수정 불가 (403)
   */
  updateStaff: async (id: number, input: UpdateStaffInput): Promise<StaffMember> => {
    const res = await api.patch<StaffMember>(`/auth/staff/${id}`, input);
    return res.data;
  },

  /**
   * 교직원 비밀번호 초기화 (원장/관리자 전용)
   * 새 임시 비밀번호 1회 반환 (대상이 원장/실장이면 403 에러)
   */
  resetStaffPassword: async (id: number): Promise<StaffRegisteredResult> => {
    const res = await api.patch<StaffRegisteredResult>(`/auth/staff/${id}/password`);
    return res.data;
  },

  /**
   * 교직원 퇴사 처리 (소프트 삭제: status -> INACTIVE)
   * 원장 계정 및 본인 계정은 퇴사 처리 불가 (403)
   */
  deleteStaff: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(`/auth/staff/${id}`);
    return res.data;
  },

  /**
   * 현재 발급된 교직원 학원 자가입 코드 조회
   */
  getStaffJoinCode: async (): Promise<StaffJoinCodeResponse> => {
    const res = await api.get<StaffJoinCodeResponse>('/auth/staff-join-code');
    return res.data;
  },

  /**
   * 교직원 학원 자가입 코드 신규 발급 또는 재발급
   */
  generateStaffJoinCode: async (): Promise<StaffJoinCodeResponse> => {
    const res = await api.post<StaffJoinCodeResponse>('/auth/staff-join-code');
    return res.data;
  },

  /**
   * [비인증] 학원 코드를 통한 강사/조교 자가입 및 즉시 로그인
   */
  joinStaffByCode: async (input: JoinStaffInput): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/join-staff', input);
    return res.data;
  },

  /**
   * 교직원 통계 계산
   */
  calculateStats: (staffList: StaffMember[]): StaffStats => {
    const totalStaff = staffList.length;
    const ownerCount = staffList.filter((s) => s.role === 'OWNER').length;
    const adminCount = staffList.filter((s) => s.role === 'ADMIN').length;
    const teacherCount = staffList.filter((s) => s.role === 'TEACHER').length;
    const staffCount = staffList.filter((s) => s.role === 'STAFF').length;

    let assignedClassesCount = 0;
    staffList.forEach((s) => {
      assignedClassesCount += s.taughtClasses?.length || 0;
    });

    const activeAccountsCount = staffList.filter(
      (s) => s.status === undefined || s.status === 'ACTIVE',
    ).length;

    return {
      totalStaff,
      ownerCount,
      adminCount,
      teacherCount,
      staffCount,
      assignedClassesCount,
      activeAccountsCount,
    };
  },
};
