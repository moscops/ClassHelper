'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  Shield,
  ShieldCheck,
  KeyRound,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Crown,
  GraduationCap,
  Sparkles,
  ChevronRight,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
  UserCheck,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { staffService } from '@/lib/staff-service';
import {
  StaffMember,
  StaffRole,
  CreateStaffInput,
  UpdateStaffInput,
} from '@/types/staff';
import { CustomDropdown, DropdownOption } from '@/components/CustomDropdown';
import { AppLayout } from '@/components/common/AppLayout';

export default function StaffPage() {
  const router = useRouter();
  const { user, academy, isAuthenticated, isHydrated } = useAuthStore();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | StaffRole>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Toast / Alert banner
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);

  // Selected Staff for actions
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState<CreateStaffInput>({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'TEACHER',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateStaffInput>({
    name: '',
    phone: '',
    role: 'TEACHER',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Delete State
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Korean Today Date String (Dashboard Spec)
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
  }, []);

  // Auto hide toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load Staff Data
  const loadStaffData = async () => {
    setIsLoading(true);
    try {
      const data = await staffService.getStaffList();
      setStaffList(data);
    } catch {
      setToastMessage({
        type: 'error',
        text: '교직원 목록을 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user && user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        alert('교직원 관리는 원장님 및 관리자 전용 메뉴입니다.');
        router.replace('/dashboard');
      } else {
        loadStaffData();
      }
    }
  }, [isHydrated, isAuthenticated, user, router]);

  // ESC key modal closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setIsPasswordModalOpen(false);
        setIsDeleteModalOpen(false);
        setIsClassModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchesRole = roleFilter === 'ALL' || staff.role === roleFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        staff.name.toLowerCase().includes(term) ||
        staff.email.toLowerCase().includes(term) ||
        (staff.phone && staff.phone.includes(term)) ||
        (staff.taughtClasses &&
          staff.taughtClasses.some((c) => c.name.toLowerCase().includes(term)));
      return matchesRole && matchesSearch;
    });
  }, [staffList, roleFilter, searchTerm]);

  // Statistics calculation
  const stats = useMemo(() => {
    return staffService.calculateStats(staffList);
  }, [staffList]);

  // Copy to clipboard helper
  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper for role metadata
  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'OWNER':
        return {
          label: '원장님',
          icon: Crown,
          bg: 'bg-amber-50 dark:bg-amber-950/60',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-200 dark:border-amber-800',
          dot: 'bg-amber-500',
          desc: '학원 최고 관리자 (모든 권한 및 학원 설정)',
        };
      case 'ADMIN':
        return {
          label: '부원장 / 실장',
          icon: ShieldCheck,
          bg: 'bg-indigo-50 dark:bg-indigo-950/60',
          text: 'text-indigo-700 dark:text-indigo-300',
          border: 'border-indigo-200 dark:border-indigo-800',
          dot: 'bg-indigo-500',
          desc: '원생/반/수강료/교직원 운영 관리',
        };
      case 'TEACHER':
        return {
          label: '전임 / 파트 강사',
          icon: GraduationCap,
          bg: 'bg-emerald-50 dark:bg-emerald-950/60',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          desc: '담당 반 수업 일지, 과제 검사, 1초 출결 관리',
        };
      case 'STAFF':
      default:
        return {
          label: '조교 / 행정스태프',
          icon: UserCheck,
          bg: 'bg-slate-100 dark:bg-slate-800',
          text: 'text-slate-700 dark:text-slate-300',
          border: 'border-slate-200 dark:border-slate-700',
          dot: 'bg-slate-500',
          desc: '등/하원 출결 체크 및 보조 업무',
        };
    }
  };

  // Create Staff Action
  const handleOpenCreateModal = () => {
    setCreateForm({
      email: '',
      password: '',
      name: '',
      phone: '',
      role: 'TEACHER',
    });
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError('교직원 이름을 입력해주세요.');
      return;
    }
    if (!createForm.email.trim() || !createForm.email.includes('@')) {
      setCreateError('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    if (createForm.password && createForm.password.length < 6) {
      setCreateError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      const newStaff = await staffService.createStaff(createForm);
      setStaffList((prev) => [newStaff, ...prev]);
      setIsCreateModalOpen(false);
      setToastMessage({
        type: 'success',
        text: `신규 교직원 [${newStaff.name}]님이 등록되었습니다.`,
      });
    } catch (err: any) {
      setCreateError(
        err?.response?.data?.message || '교직원 등록 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Edit Staff Action
  const handleOpenEditModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setEditForm({
      name: staff.name,
      phone: staff.phone || '',
      role: staff.role,
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (!editForm.name?.trim()) {
      setEditError('이름을 입력해주세요.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      const updated = await staffService.updateStaff(selectedStaff.id, editForm);
      setStaffList((prev) =>
        prev.map((s) => (s.id === selectedStaff.id ? { ...s, ...updated } : s)),
      );
      setIsEditModalOpen(false);
      setToastMessage({
        type: 'success',
        text: `[${updated.name}]님의 정보가 성공적으로 수정되었습니다.`,
      });
    } catch (err: any) {
      setEditError(
        err?.response?.data?.message || '정보 수정 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Password Reset Action
  const handleOpenPasswordModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    if (newPassword.length < 6) {
      setPasswordError('새 비밀번호는 최소 6자 이상 입력해주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsSubmittingPassword(true);
    setPasswordError(null);
    try {
      await staffService.resetStaffPassword(selectedStaff.id, {
        newPassword,
      });
      setIsPasswordModalOpen(false);
      setToastMessage({
        type: 'success',
        text: `[${selectedStaff.name}]님의 비밀번호가 재설정되었습니다.`,
      });
    } catch (err: any) {
      setPasswordError(
        err?.response?.data?.message || '비밀번호 재설정 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Delete Action
  const handleOpenDeleteModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedStaff) return;
    setIsSubmittingDelete(true);
    setDeleteError(null);
    try {
      await staffService.deleteStaff(selectedStaff.id);
      setStaffList((prev) => prev.filter((s) => s.id !== selectedStaff.id));
      setIsDeleteModalOpen(false);
      setToastMessage({
        type: 'info',
        text: `[${selectedStaff.name}]님이 퇴사/삭제 처리되었습니다.`,
      });
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.message || '교직원 삭제 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // View Classes Action
  const handleOpenClassModal = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsClassModalOpen(true);
  };

  // Dropdown options for Role Filter
  const roleFilterOptions: DropdownOption[] = [
    { value: 'ALL', label: '전체 직책', count: stats.totalStaff },
    { value: 'OWNER', label: '원장님', dot: 'bg-amber-500', count: stats.ownerCount },
    { value: 'ADMIN', label: '부원장/실장', dot: 'bg-indigo-500', count: stats.adminCount },
    { value: 'TEACHER', label: '강사', dot: 'bg-emerald-500', count: stats.teacherCount },
    { value: 'STAFF', label: '조교/스태프', dot: 'bg-slate-500', count: stats.staffCount },
  ];

  // Role options for modal dropdown
  const createRoleOptions: DropdownOption[] = [
    {
      value: 'TEACHER',
      label: '강사 (TEACHER)',
      subLabel: '수업 일지, 과제 검사, 1초 출결 권한',
      dot: 'bg-emerald-500',
    },
    {
      value: 'ADMIN',
      label: '부원장 / 실장 (ADMIN)',
      subLabel: '원생/반/수강료/교직원 운영 관리 권한',
      dot: 'bg-indigo-500',
    },
    {
      value: 'STAFF',
      label: '조교 / 스태프 (STAFF)',
      subLabel: '등하원 출결 체크 및 보조 업무 권한',
      dot: 'bg-slate-500',
    },
  ];

  const editRoleOptions: DropdownOption[] = [
    ...(selectedStaff?.role === 'OWNER'
      ? [
          {
            value: 'OWNER',
            label: '원장님 (OWNER)',
            subLabel: '학원 최고 관리자',
            dot: 'bg-amber-500',
          },
        ]
      : []),
    {
      value: 'ADMIN',
      label: '부원장 / 실장 (ADMIN)',
      subLabel: '원생/반/수강료/교직원 운영 관리 권한',
      dot: 'bg-indigo-500',
    },
    {
      value: 'TEACHER',
      label: '강사 (TEACHER)',
      subLabel: '수업 일지, 과제 검사, 1초 출결 권한',
      dot: 'bg-emerald-500',
    },
    {
      value: 'STAFF',
      label: '조교 / 스태프 (STAFF)',
      subLabel: '등하원 출결 체크 및 보조 업무 권한',
      dot: 'bg-slate-500',
    },
  ];

  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-2.5">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400">교직원 관리 센터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout currentPath="/staff">
      <main className="flex-1 relative overflow-hidden py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 relative z-10">
          {/* Toast Alert Feedback */}
          {toastMessage && (
            <div
              className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-top-2 duration-200 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                  : 'bg-indigo-50/95 dark:bg-indigo-950/95 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
              <button
                onClick={() => setToastMessage(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 1. Dashboard Standard Greeting & Header Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>교직원 & 강사진 관리 센터</span>
                  </div>
                  {todayDateStr && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{todayDateStr}</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>원장 / 관리자 전용</span>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  학원 교직원 & 강사 관리 ✨
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{academy?.name}</span>에 소속된 부원장, 전임/파트 강사, 조교 계정을 체계적으로 등록하고 담당 수업 반 배정 및 시스템 권한을 스마트하게 관리하세요.
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <button
                  onClick={loadStaffData}
                  disabled={isLoading}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </button>

                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ 신규 교직원 등록</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Top 4 Statistics Cards (Dashboard Standard Spec) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Staff */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  전체 교직원 수
                </span>
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Users className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.totalStaff}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">명 등록됨</span>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  원장 {stats.ownerCount}명
                </span>
                <span>•</span>
                <span>실장 {stats.adminCount}명</span>
                <span>•</span>
                <span>강사 {stats.teacherCount}명</span>
              </div>
            </div>

            {/* Card 2: Assigned Classes */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  개설 반 매핑 현황
                </span>
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.assignedClassesCount}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">개 반 배정</span>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>강사별 전담 수업 배정 완료</span>
              </div>
            </div>

            {/* Card 3: Role Breakdown */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  강사진 / 조교 비중
                </span>
                <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/70 border border-purple-100 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <GraduationCap className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.teacherCount + stats.staffCount}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">명 (수업/행정)</span>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>수업 강사 {stats.teacherCount}명</span>
                <span>조교 {stats.staffCount}명</span>
              </div>
            </div>

            {/* Card 4: Security & Account Status */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  계정 보안 & 활성 상태
                </span>
                <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-100 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Shield className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">100%</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">정상 가동</span>
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] text-slate-500">
                <KeyRound className="w-3 h-3 text-amber-500" />
                <span>RTR 이중 암호화 토큰 보호</span>
              </div>
            </div>
          </div>

          {/* 3. Filter & Search Toolbar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: Search Input & Role Dropdown */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="이름, 이메일, 연락처, 담당 반 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role Filter Dropdown */}
              <div className="w-full sm:w-48">
                <CustomDropdown
                  value={roleFilter}
                  onChange={(val) => setRoleFilter(val as any)}
                  options={roleFilterOptions}
                  fullWidth
                />
              </div>
            </div>

            {/* Right: View Mode Toggle & Total Counter */}
            <div className="w-full md:w-auto flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                검색 결과: <strong className="text-slate-900 dark:text-white font-bold">{filteredStaff.length}</strong>명
              </span>

              <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'GRID'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="카드 그리드 뷰"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">카드</span>
                </button>
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'TABLE'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="목록 테이블 뷰"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">목록</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Staff Content Section */}
          {isLoading ? (
            <div className="py-24 text-center space-y-3 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                교직원 및 강사진 목록을 불러오는 중입니다...
              </p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="py-20 text-center space-y-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6">
              <div className="w-14 h-14 rounded-3xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  일치하는 교직원이 없습니다.
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  검색어나 직책 필터를 변경하시거나, 새로운 강사/실장/조교 계정을 등록해보세요.
                </p>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ 신규 교직원 등록하기</span>
              </button>
            </div>
          ) : viewMode === 'GRID' ? (
            /* CARD GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStaff.map((staff) => {
                const badge = getRoleBadge(staff.role);
                const RoleIcon = badge.icon;
                const isOwner = staff.role === 'OWNER';
                const isCurrentUser = user?.id === staff.id;

                return (
                  <div
                    key={staff.id}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Card Header & Avatar */}
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          {/* Avatar */}
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-xs shrink-0 ${
                              isOwner
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 ring-2 ring-amber-400/40'
                                : staff.role === 'ADMIN'
                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 ring-2 ring-indigo-400/40'
                                : staff.role === 'TEACHER'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-400/40'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {staff.name.slice(0, 2)}
                          </div>

                          {/* Name & Role */}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                {staff.name}
                              </h3>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                  본인
                                </span>
                              )}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              <RoleIcon className="w-3 h-3 shrink-0" />
                              <span>{badge.label}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        {/* Email */}
                        <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2 min-w-0 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{staff.email}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(staff.email, staff.id)}
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            title="이메일 복사"
                          >
                            {copiedId === staff.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Phone */}
                        <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2 min-w-0 truncate">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{staff.phone || '연락처 미등록'}</span>
                          </div>
                          {staff.phone && (
                            <a
                              href={`tel:${staff.phone}`}
                              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                            >
                              전화걸기
                            </a>
                          )}
                        </div>

                        {/* Joined Date */}
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            등록일: {new Date(staff.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>

                      {/* Assigned Classes */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            담당 수업 반
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {staff.taughtClasses?.length || 0}개 반
                          </span>
                        </div>

                        {staff.taughtClasses && staff.taughtClasses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {staff.taughtClasses.slice(0, 3).map((cls) => (
                              <button
                                key={cls.id}
                                onClick={() => handleOpenClassModal(staff)}
                                className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/70 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer truncate max-w-[160px]"
                              >
                                {cls.name}
                              </button>
                            ))}
                            {staff.taughtClasses.length > 3 && (
                              <button
                                onClick={() => handleOpenClassModal(staff)}
                                className="px-2 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold hover:underline"
                              >
                                +{staff.taughtClasses.length - 3}개 더보기
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            {staff.role === 'TEACHER'
                              ? '아직 배정된 수업 반이 없습니다.'
                              : '담당 수업 반 없음 (행정/지원 직책)'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(staff)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>수정</span>
                        </button>

                        <button
                          onClick={() => handleOpenPasswordModal(staff)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          title="비밀번호 초기화"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                          <span>비번 초기화</span>
                        </button>
                      </div>

                      {!isOwner && (
                        <button
                          onClick={() => handleOpenDeleteModal(staff)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title="교직원 삭제/퇴사 처리"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">교직원 정보</th>
                      <th className="py-3.5 px-4">직책 및 권한</th>
                      <th className="py-3.5 px-4">연락처</th>
                      <th className="py-3.5 px-4">담당 수업 반</th>
                      <th className="py-3.5 px-4">등록일자</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">관리 액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredStaff.map((staff) => {
                      const badge = getRoleBadge(staff.role);
                      const RoleIcon = badge.icon;
                      const isOwner = staff.role === 'OWNER';
                      const isCurrentUser = user?.id === staff.id;

                      return (
                        <tr
                          key={staff.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Name & Email */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                  isOwner
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                                  : staff.role === 'ADMIN'
                                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200'
                                  : staff.role === 'TEACHER'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {staff.name.slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {staff.name}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                      본인
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 block truncate">
                                  {staff.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                            >
                              <RoleIcon className="w-3.5 h-3.5" />
                              <span>{badge.label}</span>
                            </span>
                          </td>

                          {/* Phone */}
                          <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                            {staff.phone ? (
                              <span>{staff.phone}</span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">미등록</span>
                            )}
                          </td>

                          {/* Assigned Classes */}
                          <td className="py-4 px-4">
                            {staff.taughtClasses && staff.taughtClasses.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {staff.taughtClasses.slice(0, 2).map((cls) => (
                                  <button
                                    key={cls.id}
                                    onClick={() => handleOpenClassModal(staff)}
                                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                                  >
                                    {cls.name}
                                  </button>
                                ))}
                                {staff.taughtClasses.length > 2 && (
                                  <button
                                    onClick={() => handleOpenClassModal(staff)}
                                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    +{staff.taughtClasses.length - 2}개
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">배정 반 없음</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-4 px-4 text-xs text-slate-500">
                            {new Date(staff.createdAt).toLocaleDateString('ko-KR')}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(staff)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                                title="정보 수정"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenPasswordModal(staff)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors cursor-pointer"
                                title="비밀번호 초기화"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              {!isOwner && (
                                <button
                                  onClick={() => handleOpenDeleteModal(staff)}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                  title="삭제/퇴사"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: 신규 교직원 등록 모달                                               */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    신규 교직원 계정 등록
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    소속 학원에 새로운 강사, 실장 또는 조교 계정을 추가합니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <form
              id="create-staff-form"
              onSubmit={handleCreateSubmit}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0"
            >
              {createError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  직책 및 권한 <span className="text-rose-500">*</span>
                </label>
                <CustomDropdown
                  value={createForm.role}
                  onChange={(val) =>
                    setCreateForm((prev) => ({ ...prev, role: val as any }))
                  }
                  options={createRoleOptions}
                  fullWidth
                />
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  교직원 이름 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 김도현 강사"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Email (Login ID) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  로그인 이메일 (계정 ID) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="예: math.kim@classhelper.kr"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    초기 비밀번호
                  </label>
                  <span className="text-[11px] text-slate-400">
                    미입력 시 기본값 (classhelper1234!)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="최소 6자 이상"
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  연락처 (휴대폰 번호)
                </label>
                <input
                  type="tel"
                  placeholder="예: 010-1234-5678"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Role Guide Card */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>직책별 시스템 권한 안내</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                  <li>
                    <strong>강사 (TEACHER):</strong> 본인 담당 반 출결 체크, 수업 일지/진도 기록, 과제 검사/피드백
                  </li>
                  <li>
                    <strong>부원장/실장 (ADMIN):</strong> 원생/반 등록 및 배정, 수강료 청구 및 수납 처리, 교직원 조회
                  </li>
                  <li>
                    <strong>조교 (STAFF):</strong> 학생 등하원 1초 출결 체크 및 기본 보조 업무
                  </li>
                </ul>
              </div>
            </form>

            {/* Fixed Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                form="create-staff-form"
                disabled={isSubmittingCreate}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmittingCreate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>등록 중...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>교직원 등록 완료</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: 교직원 정보 수정 모달                                             */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    교직원 정보 수정
                  </h3>
                  <p className="text-[11px] text-slate-400">{selectedStaff.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="edit-staff-form"
              onSubmit={handleEditSubmit}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0"
            >
              {editError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  직책 및 권한
                </label>
                <CustomDropdown
                  value={editForm.role || 'TEACHER'}
                  onChange={(val) =>
                    setEditForm((prev) => ({ ...prev, role: val as any }))
                  }
                  options={editRoleOptions}
                  disabled={selectedStaff.role === 'OWNER'}
                  fullWidth
                />
                {selectedStaff.role === 'OWNER' && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                    원장님 계정의 직책은 변경할 수 없습니다.
                  </span>
                )}
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  이름 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  연락처
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </form>

            <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                form="edit-staff-form"
                disabled={isSubmittingEdit}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmittingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  <span>변경사항 저장</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: 비밀번호 초기화 모달                                               */}
      {/* ========================================================================= */}
      {isPasswordModalOpen && selectedStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPasswordModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    비밀번호 초기화
                  </h3>
                  <p className="text-[11px] text-slate-400">{selectedStaff.name} ({selectedStaff.email})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="password-reset-form"
              onSubmit={handlePasswordSubmit}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0"
            >
              {passwordError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
                💡 원장님이 설정한 새 비밀번호로 해당 직원의 계정이 즉시 갱신됩니다. 직원이 로그인할 수 있도록 변경된 비밀번호를 전달해주세요.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  새 비밀번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="최소 6자 이상"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  비밀번호 확인 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="새 비밀번호 다시 입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </form>

            <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                form="password-reset-form"
                disabled={isSubmittingPassword}
                className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-amber-600/20 disabled:opacity-50"
              >
                {isSubmittingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>재설정 중...</span>
                  </>
                ) : (
                  <span>비밀번호 재설정 완료</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: 교직원 삭제 / 퇴사 처리 확인 모달                                   */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && selectedStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeleteModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  교직원 퇴사 / 삭제 확인
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
              {deleteError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                정말로 <strong className="text-rose-600 font-bold">[{selectedStaff.name}]</strong>님의 계정을 학원에서 삭제/퇴사 처리하시겠습니까?
              </p>

              {selectedStaff.taughtClasses && selectedStaff.taughtClasses.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>주의: 담당 수업 반 안내</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    현재 <strong>{selectedStaff.taughtClasses.length}개 반</strong>({selectedStaff.taughtClasses.map((c) => c.name).join(', ')})을 담당하고 있습니다. 삭제 시 해당 반의 강사 배정 정보가 해제됩니다.
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmittingDelete}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>삭제 중...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>퇴사/삭제 실행</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: 담당 수업 반 목록 조회 모달                                         */}
      {/* ========================================================================= */}
      {isClassModalOpen && selectedStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsClassModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    [{selectedStaff.name}] 강사 담당 반 목록
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    총 {selectedStaff.taughtClasses?.length || 0}개 수업 반 배정됨
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 min-h-0">
              {selectedStaff.taughtClasses && selectedStaff.taughtClasses.length > 0 ? (
                selectedStaff.taughtClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {cls.name}
                        </h4>
                        {cls.subject && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                            {cls.subject}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          cls.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {cls.status === 'ACTIVE' ? '운영 중' : '휴강/종강'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <div>
                        대상 학년: <strong className="text-slate-700 dark:text-slate-200">{cls.targetGrade || '전체'}</strong>
                      </div>
                      <div>
                        수강생 수: <strong className="text-slate-700 dark:text-slate-200">{cls.enrolledCount || 0}명</strong> / 정원 {cls.capacity || '무제한'}
                      </div>
                      <div className="col-span-2">
                        시간표: <strong className="text-slate-700 dark:text-slate-200">{cls.schedule || '시간표 정보 없음'}</strong>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-xs text-slate-400">
                  배정된 수업 반이 없습니다.
                </p>
              )}
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 flex items-center justify-between">
              <Link
                href="/classes"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>반 관리 페이지로 이동</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setIsClassModalOpen(false)}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
