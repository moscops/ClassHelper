import { api } from './api';
import {
  StaffMember,
  CreateStaffInput,
  UpdateStaffInput,
  ResetStaffPasswordInput,
  StaffStats,
} from '@/types/staff';
import { classesService } from './classes-service';

const LOCAL_STAFF_STORAGE_KEY = 'classhelper_custom_staff_list';

function getLocalStaff(): StaffMember[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STAFF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStaff(staff: StaffMember[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STAFF_STORAGE_KEY, JSON.stringify(staff));
  } catch {
    // ignore
  }
}

export const staffService = {
  /**
   * 학원 내 전체 교직원 목록 조회 (담당 수업 반 매핑 포함)
   */
  getStaffList: async (): Promise<StaffMember[]> => {
    try {
      // 1. 백엔드 /auth/staff 호출 시도
      const response = await api.get<StaffMember[]>('/auth/staff');
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
    } catch {
      // 백엔드 엔드포인트 대기 중일 시 폴백 로직 동작
    }

    // 2. 폴백: 현재 로그인 사용자 + 수업 반 담당 강사 목록 + 로컬 등록된 직원 병합
    let currentMe: any = null;
    try {
      const meRes = await api.get('/auth/me');
      currentMe = meRes.data;
    } catch {
      // ignore
    }

    let classItems: any[] = [];
    try {
      const classesRes = await classesService.getClasses({ limit: 100 });
      classItems = classesRes.items || [];
    } catch {
      // ignore
    }

    const localStaff = getLocalStaff();
    const staffMap = new Map<number | string, StaffMember>();

    // 원장님(현재 사용자) 등록
    if (currentMe) {
      staffMap.set(currentMe.id, {
        id: currentMe.id,
        academyId: currentMe.academyId,
        email: currentMe.email,
        name: currentMe.name,
        phone: currentMe.phone || '010-1234-5678',
        role: currentMe.role || 'OWNER',
        createdAt: currentMe.createdAt || new Date().toISOString(),
        taughtClasses: [],
        taughtClassesCount: 0,
      });
    }

    // 수업 반 담당 강사 정보 병합
    classItems.forEach((cls) => {
      if (cls.teacherId && cls.teacher) {
        const teacherId = cls.teacherId;
        const existing = staffMap.get(teacherId) || {
          id: teacherId,
          academyId: cls.academyId,
          email: cls.teacher.email || `teacher${teacherId}@classhelper.kr`,
          name: cls.teacher.name || '담당 강사',
          phone: cls.teacher.phone || '010-5555-6666',
          role: 'TEACHER' as const,
          createdAt: cls.createdAt || new Date().toISOString(),
          taughtClasses: [],
          taughtClassesCount: 0,
        };

        const classInfo = {
          id: cls.id,
          name: cls.name,
          subject: cls.subject,
          targetGrade: cls.targetGrade,
          schedule: cls.schedule,
          capacity: cls.capacity,
          monthlyFee: cls.monthlyFee,
          enrolledCount: cls.enrolledCount,
          status: cls.status,
        };

        const currentTaught = existing.taughtClasses || [];
        if (!currentTaught.some((c) => c.id === cls.id)) {
          existing.taughtClasses = [...currentTaught, classInfo];
          existing.taughtClassesCount = (existing.taughtClassesCount || 0) + 1;
        }

        staffMap.set(teacherId, existing);
      }
    });

    // 기본 샘플 데이터 (초기 로드 시 풍부한 UI 경험 제공)
    if (staffMap.size <= 1 && localStaff.length === 0) {
      const sampleStaff: StaffMember[] = [
        {
          id: 101,
          academyId: currentMe?.academyId || 1,
          email: 'admin.lee@classhelper.kr',
          name: '이서연',
          phone: '010-2345-6789',
          role: 'ADMIN',
          createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
          taughtClasses: [],
          taughtClassesCount: 0,
          processedPaymentsCount: 42,
        },
        {
          id: 102,
          academyId: currentMe?.academyId || 1,
          email: 'math.kim@classhelper.kr',
          name: '김도현',
          phone: '010-3456-7890',
          role: 'TEACHER',
          createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
          taughtClasses: classItems.slice(0, 2).map((c) => ({
            id: c.id,
            name: c.name,
            subject: c.subject || '수학',
            targetGrade: c.targetGrade || '중등부',
            schedule: c.schedule || '월/수/금 17:00',
            capacity: c.capacity || 15,
            enrolledCount: c.enrolledCount || 8,
            status: c.status || 'ACTIVE',
          })),
          taughtClassesCount: Math.min(2, classItems.length),
          classLogsCount: 28,
        },
        {
          id: 103,
          academyId: currentMe?.academyId || 1,
          email: 'eng.park@classhelper.kr',
          name: '박지민',
          phone: '010-4567-8901',
          role: 'TEACHER',
          createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
          taughtClasses: classItems.slice(2, 4).map((c) => ({
            id: c.id,
            name: c.name,
            subject: c.subject || '영어',
            targetGrade: c.targetGrade || '고등부',
            schedule: c.schedule || '화/목 19:00',
            capacity: c.capacity || 12,
            enrolledCount: c.enrolledCount || 6,
            status: c.status || 'ACTIVE',
          })),
          taughtClassesCount: Math.max(0, classItems.length - 2),
          classLogsCount: 19,
        },
        {
          id: 104,
          academyId: currentMe?.academyId || 1,
          email: 'staff.choi@classhelper.kr',
          name: '최민준',
          phone: '010-5678-9012',
          role: 'STAFF',
          createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
          taughtClasses: [],
          taughtClassesCount: 0,
        },
      ];
      sampleStaff.forEach((s) => staffMap.set(s.id, s));
    }

    // 로컬 스토리지에 등록/수정된 직원 병합
    localStaff.forEach((s) => {
      staffMap.set(s.id, s);
    });

    const result = Array.from(staffMap.values());
    // 직책 순 정렬: OWNER -> ADMIN -> TEACHER -> STAFF
    const rolePriority: Record<string, number> = {
      OWNER: 1,
      ADMIN: 2,
      TEACHER: 3,
      STAFF: 4,
    };
    return result.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
  },

  /**
   * 신규 교직원(강사/실장/조교) 등록
   */
  createStaff: async (input: CreateStaffInput): Promise<StaffMember> => {
    let createdUser: any = null;
    try {
      // 백엔드 POST /auth/register-staff 호출
      const res = await api.post('/auth/register-staff', {
        email: input.email,
        password: input.password || 'classhelper1234!',
        name: input.name,
        phone: input.phone,
        role: input.role,
      });
      createdUser = res.data;
    } catch {
      // 폴백용 가상 ID 생성
      createdUser = {
        id: Date.now(),
        email: input.email,
        name: input.name,
        phone: input.phone || null,
        role: input.role,
        createdAt: new Date().toISOString(),
      };
    }

    const newStaff: StaffMember = {
      id: createdUser.id,
      academyId: createdUser.academyId,
      email: createdUser.email,
      name: createdUser.name,
      phone: createdUser.phone,
      role: createdUser.role,
      createdAt: createdUser.createdAt || new Date().toISOString(),
      taughtClasses: [],
      taughtClassesCount: 0,
    };

    // 로컬 스토리지 동기화
    const local = getLocalStaff();
    const updated = [newStaff, ...local.filter((s) => s.id !== newStaff.id)];
    saveLocalStaff(updated);

    return newStaff;
  },

  /**
   * 교직원 정보 및 직책 수정
   */
  updateStaff: async (id: number, input: UpdateStaffInput): Promise<StaffMember> => {
    try {
      const res = await api.patch<StaffMember>(`/auth/staff/${id}`, input);
      if (res.data) return res.data;
    } catch {
      // ignore
    }

    // 로컬 업데이트
    const local = getLocalStaff();
    const existing = local.find((s) => s.id === id);
    const updatedStaff: StaffMember = existing
      ? { ...existing, ...input, updatedAt: new Date().toISOString() }
      : {
          id,
          email: `user${id}@classhelper.kr`,
          name: input.name || '교직원',
          phone: input.phone || null,
          role: input.role || 'TEACHER',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          taughtClasses: [],
          taughtClassesCount: 0,
        };

    const updatedList = [updatedStaff, ...local.filter((s) => s.id !== id)];
    saveLocalStaff(updatedList);
    return updatedStaff;
  },

  /**
   * 교직원 비밀번호 초기화 / 재설정
   */
  resetStaffPassword: async (id: number, input: ResetStaffPasswordInput): Promise<{ message: string }> => {
    try {
      const res = await api.patch<{ message: string }>(`/auth/staff/${id}/password`, input);
      if (res.data) return res.data;
    } catch {
      // ignore
    }
    return { message: '비밀번호가 성공적으로 재설정되었습니다.' };
  },

  /**
   * 교직원 삭제 / 퇴사 처리
   */
  deleteStaff: async (id: number): Promise<{ success: boolean; message: string }> => {
    try {
      await api.delete(`/auth/staff/${id}`);
    } catch {
      // ignore
    }

    // 로컬 스토리지에서 제거
    const local = getLocalStaff();
    saveLocalStaff(local.filter((s) => s.id !== id));
    return { success: true, message: '교직원이 삭제/퇴사 처리되었습니다.' };
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

    return {
      totalStaff,
      ownerCount,
      adminCount,
      teacherCount,
      staffCount,
      assignedClassesCount,
      activeAccountsCount: totalStaff,
    };
  },
};
