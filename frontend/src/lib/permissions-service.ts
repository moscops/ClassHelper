import { api } from './api';
import {
  RolePermissionItem,
  UpdateRolePermissionItem,
  UpdateRolePermissionsPayload,
  PermissionModule,
  ControllableRole,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_MODULES,
  CONTROLLABLE_ROLES,
} from '@/types/permission';

export const permissionsService = {
  /**
   * 학원 내 역할별 권한 매트릭스 전체 조회 (GET /auth/role-permissions)
   * 3역할 x 8메뉴 = 24개 항목 반환 (원장/실장 전용)
   */
  getRolePermissions: async (): Promise<RolePermissionItem[]> => {
    const response = await api.get<RolePermissionItem[]>('/auth/role-permissions');
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 학원 내 역할별 권한 매트릭스 업데이트 (PATCH /auth/role-permissions)
   * 변경할 항목만 전달 (원장 전용)
   */
  updateRolePermissions: async (
    permissions: UpdateRolePermissionItem[],
  ): Promise<RolePermissionItem[]> => {
    const payload: UpdateRolePermissionsPayload = { permissions };
    const response = await api.patch<RolePermissionItem[]>(
      '/auth/role-permissions',
      payload,
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * 클라이언트용 기본 권한 목록 (24개 조합) 생성
   */
  getDefaultPermissions: (): RolePermissionItem[] => {
    const result: RolePermissionItem[] = [];
    for (const { role } of CONTROLLABLE_ROLES) {
      for (const { key: module } of PERMISSION_MODULES) {
        result.push({
          role,
          module,
          canEdit: DEFAULT_ROLE_PERMISSIONS[role][module] ?? false,
        });
      }
    }
    return result;
  },

  /**
   * 사용자의 특정 메뉴 수정 가능 여부 판정
   * OWNER 및 SUPER_ADMIN은 항상 전권(true)
   * ADMIN/TEACHER/STAFF는 전달된 permissions 배열 또는 기본값으로 판정
   */
  canEditModule: (
    role: string | undefined,
    module: PermissionModule,
    permissions?: RolePermissionItem[],
  ): boolean => {
    if (!role) return false;
    if (role === 'OWNER' || role === 'SUPER_ADMIN') return true;

    if (role === 'ADMIN' || role === 'TEACHER' || role === 'STAFF') {
      const controllableRole = role as ControllableRole;
      if (permissions && permissions.length > 0) {
        const item = permissions.find(
          (p) => p.role === controllableRole && p.module === module,
        );
        if (item !== undefined) {
          return item.canEdit;
        }
      }
      return DEFAULT_ROLE_PERMISSIONS[controllableRole]?.[module] ?? false;
    }

    return false;
  },
};
