import { api } from './api';
import {
  AuthResponse,
  UserDetailResponse,
  ChangePasswordPayload,
  ChangePasswordResponse,
} from '@/types/auth';
import { JoinStaffInput } from '@/types/staff';


export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterOwnerPayload {
  academyName: string;
  businessNumber?: string;
  academyPhone?: string;
  address?: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export const authService = {
  /**
   * 이메일/비밀번호 로그인
   */
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  /**
   * 학원 개설 및 원장님 회원가입
   */
  registerOwner: async (payload: RegisterOwnerPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register-owner', payload);
    return response.data;
  },

  /**
   * 현재 로그인 사용자 및 학원 정보 조회
   */
  getMe: async (): Promise<UserDetailResponse> => {
    const response = await api.get<UserDetailResponse>('/auth/me');
    return response.data;
  },

  /**
   * 본인 비밀번호 변경 (원장/강사/관리자 공통, 임시 비밀번호 mustChangePassword 해제)
   */
  changePassword: async (payload: ChangePasswordPayload): Promise<ChangePasswordResponse> => {
    const response = await api.patch<ChangePasswordResponse>('/auth/change-password', payload);
    return response.data;
  },

  /**
   * [비인증] 학원 코드로 교직원(강사/조교) 자가입 및 즉시 로그인
   */
  joinStaff: async (payload: JoinStaffInput): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/join-staff', payload);
    return response.data;
  },

  /**
   * 로그아웃 (서버 Refresh Token 무효화)
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network error on logout
    }
  },
};


