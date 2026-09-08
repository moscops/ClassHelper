'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  Check,
  Info,
  Users,
  BookOpen,
  FileText,
  CreditCard,
  Calendar,
  Bell,
  BarChart2,
  Eye,
  Sliders,
  Crown,
  UserCheck,
  GraduationCap,
} from 'lucide-react';
import {
  PermissionModule,
  ControllableRole,
  RolePermissionItem,
  UpdateRolePermissionItem,
  PERMISSION_MODULES,
  CONTROLLABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/types/permission';
import { permissionsService } from '@/lib/permissions-service';
import { usePermissionsStore } from '@/stores/usePermissionsStore';
import { useAuthStore } from '@/stores/useAuthStore';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function RolePermissionsModal({
  isOpen,
  onClose,
  onSuccess,
}: RolePermissionsModalProps) {
  const { user } = useAuthStore();
  const isOwner = user?.role === 'OWNER';
  const isAdmin = user?.role === 'ADMIN';

  const [permissions, setPermissions] = useState<RolePermissionItem[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<RolePermissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRoleTab, setSelectedRoleTab] = useState<'ALL' | ControllableRole>('ALL');

  // Helper to map module icon name to component
  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users':
        return Users;
      case 'BookOpen':
        return BookOpen;
      case 'CheckCircle2':
        return CheckCircle2;
      case 'FileText':
        return FileText;
      case 'CreditCard':
        return CreditCard;
      case 'Calendar':
        return Calendar;
      case 'Bell':
        return Bell;
      case 'BarChart2':
        return BarChart2;
      default:
        return Sliders;
    }
  };

  // Helper for role metadata
  const getRoleMeta = (role: ControllableRole) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: '부원장 / 실장 (ADMIN)',
          shortLabel: '실장',
          icon: ShieldCheck,
          color: 'indigo',
          badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
          badgeText: 'text-indigo-700 dark:text-indigo-300',
          badgeBorder: 'border-indigo-200 dark:border-indigo-800',
          dot: 'bg-indigo-500',
        };
      case 'TEACHER':
        return {
          label: '강사 (TEACHER)',
          shortLabel: '강사',
          icon: GraduationCap,
          color: 'emerald',
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
          badgeText: 'text-emerald-700 dark:text-emerald-300',
          badgeBorder: 'border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500',
        };
      case 'STAFF':
        return {
          label: '조교 / 스태프 (STAFF)',
          shortLabel: '조교',
          icon: UserCheck,
          color: 'slate',
          badgeBg: 'bg-slate-100 dark:bg-slate-800',
          badgeText: 'text-slate-700 dark:text-slate-300',
          badgeBorder: 'border-slate-200 dark:border-slate-700',
          dot: 'bg-slate-500',
        };
    }
  };

  // Load permissions when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    const loadData = async () => {
      try {
        const data = await permissionsService.getRolePermissions();
        if (isMounted) {
          setPermissions(data);
          setOriginalPermissions(JSON.parse(JSON.stringify(data)));
        }
      } catch (err: any) {
        if (isMounted) {
          const fallback = permissionsService.getDefaultPermissions();
          setPermissions(fallback);
          setOriginalPermissions(JSON.parse(JSON.stringify(fallback)));
          setErrorMessage(
            err?.response?.data?.message ||
              '권한 매트릭스를 불러오는 중 오류가 발생하여 기본값을 표시합니다.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Find permission item in current state
  const getPermission = (role: ControllableRole, module: PermissionModule): boolean => {
    const item = permissions.find((p) => p.role === role && p.module === module);
    if (item !== undefined) return item.canEdit;
    return DEFAULT_ROLE_PERMISSIONS[role]?.[module] ?? false;
  };

  // Toggle permission
  const handleToggle = (role: ControllableRole, module: PermissionModule) => {
    if (!isOwner) return;

    setPermissions((prev) => {
      const existingIdx = prev.findIndex((p) => p.role === role && p.module === module);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          canEdit: !next[existingIdx].canEdit,
        };
        return next;
      } else {
        return [
          ...prev,
          {
            role,
            module,
            canEdit: !getPermission(role, module),
          },
        ];
      }
    });
  };

  // Batch toggle for a specific role
  const handleBatchToggleRole = (role: ControllableRole, enableAll: boolean) => {
    if (!isOwner) return;

    setPermissions((prev) => {
      const nextMap = new Map<string, RolePermissionItem>();
      prev.forEach((item) => {
        nextMap.set(`${item.role}:${item.module}`, { ...item });
      });

      for (const mod of PERMISSION_MODULES) {
        nextMap.set(`${role}:${mod.key}`, {
          role,
          module: mod.key,
          canEdit: enableAll,
        });
      }

      return Array.from(nextMap.values());
    });
  };

  // Reset to system recommended defaults
  const handleResetToDefaults = () => {
    if (!isOwner) return;
    const defaults = permissionsService.getDefaultPermissions();
    setPermissions(defaults);
  };

  // Compute changed items compared to original
  const changedItems = useMemo(() => {
    const changes: UpdateRolePermissionItem[] = [];
    for (const item of permissions) {
      const original = originalPermissions.find(
        (o) => o.role === item.role && o.module === item.module,
      );
      if (original && original.canEdit !== item.canEdit) {
        changes.push({
          role: item.role,
          module: item.module,
          canEdit: item.canEdit,
        });
      }
    }
    return changes;
  }, [permissions, originalPermissions]);

  const hasChanges = changedItems.length > 0;

  // Save changes
  const handleSave = async () => {
    if (!isOwner) return;
    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updated = await permissionsService.updateRolePermissions(changedItems);
      // Refresh global Zustand cache
      usePermissionsStore.getState().fetchPermissions(undefined, true);

      onSuccess?.(`역할별 메뉴 권한 (${changedItems.length}건)이 성공적으로 저장되었습니다.`);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message ||
          '권한 변경 사항을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* 1. Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  역할별 메뉴 권한 설정 (Role Permissions)
                </h3>
                {isOwner ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 shrink-0">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>원장님 편집 모드</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shrink-0">
                    <Eye className="w-3 h-3 text-indigo-500" />
                    <span>실장 조회 전용</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isOwner
                  ? '부원장(실장), 강사, 조교의 8대 메뉴 수정 권한을 맞춤 설정하세요.'
                  : '실장 계정은 권한 현황을 조회할 수 있으며, 권한 수정은 학원장(OWNER)만 가능합니다.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Notice Banner */}
        <div className="px-6 pt-4 pb-1">
          {isOwner ? (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">
                  원장님이 각 직책의 '수정' 권한을 비활성화하면, 해당 직책은 안전하게 '조회 전용'으로 전환됩니다.
                </p>
                <p className="text-indigo-700 dark:text-indigo-300/80 text-[11px]">
                  비활성화된 메뉴에서 데이터 수정/생성/삭제 시도 시 시스템 레벨(PermissionGuard)에서 차단되며 권한 안내 메시지가 표시됩니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  현재 실장(ADMIN) 모드로 조회 중입니다.
                </p>
                <p className="text-amber-700 dark:text-amber-300/80 text-[11px]">
                  역할별 수정 권한의 변경 및 저장은 학원 최고 관리자(OWNER)만 가능합니다.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* 3. View Switcher & Role Tabs */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setSelectedRoleTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedRoleTab === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              전체 매트릭스 (한눈에 보기)
            </button>
            {CONTROLLABLE_ROLES.map(({ role, label }) => {
              const meta = getRoleMeta(role);
              const RoleIcon = meta.icon;
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRoleTab(role)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    selectedRoleTab === role
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <RoleIcon className="w-3.5 h-3.5" />
                  <span>{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Helpers for Owner */}
          {isOwner && (
            <div className="flex items-center gap-2 text-xs">
              {selectedRoleTab !== 'ALL' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleBatchToggleRole(selectedRoleTab, true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium hover:bg-emerald-100 transition-colors"
                  >
                    전체 수정 허용
                  </button>
                  <button
                    onClick={() => handleBatchToggleRole(selectedRoleTab, false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-200 transition-colors"
                  >
                    전체 조회 전용
                  </button>
                </div>
              )}
              <button
                onClick={handleResetToDefaults}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium border border-transparent hover:border-slate-200"
                title="시스템 권장 기본 권한값으로 재설정"
              >
                <RotateCcw className="w-3 h-3" />
                <span>기본값 복원</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Matrix / Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs">역할별 권한 매트릭스를 불러오는 중입니다...</p>
            </div>
          ) : selectedRoleTab === 'ALL' ? (
            /* VIEW A: Full 3 Roles x 8 Modules Matrix Table */
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 min-w-[220px]">
                        학원 핵심 기능 메뉴
                      </th>
                      {CONTROLLABLE_ROLES.map(({ role, label }) => {
                        const meta = getRoleMeta(role);
                        const RoleIcon = meta.icon;
                        return (
                          <th
                            key={role}
                            className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center min-w-[150px]"
                          >
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                              <RoleIcon className={`w-3.5 h-3.5 text-${meta.color}-500`} />
                              <span>{label}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {PERMISSION_MODULES.map((mod) => {
                      const ModIcon = getModuleIcon(mod.iconName);
                      return (
                        <tr
                          key={mod.key}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                                <ModIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{mod.label}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {mod.key}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                  {mod.description}
                                </p>
                              </div>
                            </div>
                          </td>

                          {CONTROLLABLE_ROLES.map(({ role }) => {
                            const canEdit = getPermission(role, mod.key);
                            return (
                              <td
                                key={`${role}-${mod.key}`}
                                className="py-3 px-4 text-center align-middle"
                              >
                                <button
                                  type="button"
                                  disabled={!isOwner}
                                  onClick={() => handleToggle(role, mod.key)}
                                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all select-none ${
                                    !isOwner
                                      ? canEdit
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 opacity-70 cursor-not-allowed'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed'
                                      : canEdit
                                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs hover:bg-emerald-600 cursor-pointer'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer'
                                  }`}
                                  title={
                                    !isOwner
                                      ? '권한 수정은 학원장만 가능합니다'
                                      : canEdit
                                      ? '클릭하여 조회 전용으로 전환'
                                      : '클릭하여 수정 가능으로 전환'
                                  }
                                >
                                  {canEdit ? (
                                    <>
                                      <Unlock className="w-3 h-3" />
                                      <span>수정 가능</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3 h-3 opacity-60" />
                                      <span>조회 전용</span>
                                    </>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VIEW B: Single Role Detailed Card Grid */
            <div className="space-y-3">
              {/* Role Header Info */}
              {(() => {
                const meta = getRoleMeta(selectedRoleTab);
                const RoleIcon = meta.icon;
                return (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">
                        <RoleIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {meta.label} 권한 세부 설정
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          총 8개 메뉴 중 {PERMISSION_MODULES.filter((m) => getPermission(selectedRoleTab, m.key)).length}개 메뉴 수정 허용됨
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PERMISSION_MODULES.map((mod) => {
                  const ModIcon = getModuleIcon(mod.iconName);
                  const canEdit = getPermission(selectedRoleTab, mod.key);

                  return (
                    <div
                      key={mod.key}
                      onClick={() => {
                        if (isOwner) handleToggle(selectedRoleTab, mod.key);
                      }}
                      className={`p-4 rounded-2xl border transition-all select-none ${
                        isOwner ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700' : ''
                      } ${
                        canEdit
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              canEdit
                                ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <ModIcon className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {mod.label}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {mod.description}
                            </p>
                          </div>
                        </div>

                        {/* Toggle switch visual */}
                        <div
                          className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors shrink-0 ${
                            canEdit
                              ? 'bg-emerald-500'
                              : 'bg-slate-200 dark:bg-slate-700'
                          } ${!isOwner ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div
                            className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                              canEdit ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">현재 상태</span>
                        <span
                          className={`font-semibold ${
                            canEdit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {canEdit ? '수정 및 등록/삭제 가능' : '조회 전용 (수정 불가)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 5. Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {hasChanges ? (
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{changedItems.length}개 권한 항목이 변경되었습니다</span>
              </span>
            ) : (
              <span>저장할 변경 사항이 없습니다</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              닫기
            </button>

            {isOwner && (
              <button
                type="button"
                disabled={isSaving || !hasChanges}
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>권한 변경사항 저장</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
