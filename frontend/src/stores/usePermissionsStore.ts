'use client';

import { create } from 'zustand';
import {
  RolePermissionItem,
  UpdateRolePermissionItem,
  PermissionModule,
} from '@/types/permission';
import { permissionsService } from '@/lib/permissions-service';
import { useAuthStore } from './useAuthStore';

interface PermissionsState {
  permissions: RolePermissionItem[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAcademyId: number | null;

  // Actions
  fetchPermissions: (academyId?: number, force?: boolean) => Promise<void>;
  updatePermissions: (
    updates: UpdateRolePermissionItem[],
  ) => Promise<RolePermissionItem[]>;
  canEdit: (module: PermissionModule) => boolean;
  clear: () => void;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  permissions: [],
  isLoading: false,
  error: null,
  lastFetchedAcademyId: null,

  fetchPermissions: async (academyId?: number, force = false) => {
    const currentAcademyId =
      academyId || useAuthStore.getState().academy?.id || null;
    if (!currentAcademyId) return;

    // 이미 캐시되어 있고 강제 갱신이 아니며 같은 학원인 경우 스킵
    if (
      !force &&
      get().permissions.length > 0 &&
      get().lastFetchedAcademyId === currentAcademyId
    ) {
      return;
    }

    const currentUser = useAuthStore.getState().user;
    // OWNER나 ADMIN인 경우에만 백엔드 GET /auth/role-permissions 호출 가능
    if (currentUser?.role !== 'OWNER' && currentUser?.role !== 'ADMIN') {
      // TEACHER, STAFF 등은 백엔드 엔드포인트 권한(403)이 없으므로 기본값 로드
      set({
        permissions: permissionsService.getDefaultPermissions(),
        lastFetchedAcademyId: currentAcademyId,
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const data = await permissionsService.getRolePermissions();
      set({
        permissions: data,
        lastFetchedAcademyId: currentAcademyId,
        isLoading: false,
      });
    } catch (err: any) {
      // 에러 발생 시 기본값 폴백
      set({
        permissions: permissionsService.getDefaultPermissions(),
        lastFetchedAcademyId: currentAcademyId,
        isLoading: false,
        error: err?.response?.data?.message || '권한 정보를 불러오지 못했습니다.',
      });
    }
  },

  updatePermissions: async (updates: UpdateRolePermissionItem[]) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await permissionsService.updateRolePermissions(updates);
      const academyId = useAuthStore.getState().academy?.id || null;
      set({
        permissions: updated,
        lastFetchedAcademyId: academyId,
        isLoading: false,
      });
      return updated;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message });
      throw err;
    }
  },

  canEdit: (module: PermissionModule): boolean => {
    const user = useAuthStore.getState().user;
    if (!user) return false;
    return permissionsService.canEditModule(
      user.role,
      module,
      get().permissions,
    );
  },

  clear: () => {
    set({
      permissions: [],
      isLoading: false,
      error: null,
      lastFetchedAcademyId: null,
    });
  },
}));
