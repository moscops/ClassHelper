'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Search,
  Phone,
  UserCheck,
  UserMinus,
  UserX,
  Edit3,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  ChevronDown,
  PauseCircle,
  User,
  ArrowRight,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  FileText,
  CheckCircle,
  Send,
  Calendar,
  Sparkles,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  studentsService,
  StudentItem,
  StudentDetailItem,
  StudentStatus,
  Gender,
  BulkImportResult,
} from '@/lib/students-service';
import { reportsService, StudentReport } from '@/lib/reports-service';
import { classesService, ClassItem } from '@/lib/classes-service';
import { CustomDatePicker } from '@/components/CustomDatePicker';
import { AppLayout } from '@/components/common/AppLayout';

export default function StudentsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  // Data & Filter states
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StudentStatus>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');

  // Student Create / Edit Modal State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [studentFormData, setStudentFormData] = useState({
    name: '',
    gender: '' as Gender | '',
    birthDate: '',
    schoolName: '',
    grade: '',
    studentPhone: '',
    parentPhone: '',
    parentName: '',
    parentRelationship: '모',
    status: 'ACTIVE' as StudentStatus,
    enrolledAt: new Date().toISOString().split('T')[0],
    memo: '',
  });
  const [nameError, setNameError] = useState<string | null>(null);
  const [parentPhoneError, setParentPhoneError] = useState<string | null>(null);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isClassFilterOpen, setIsClassFilterOpen] = useState(false);
  const [isParentRelOpen, setIsParentRelOpen] = useState(false);

  // Student Detail / Enrolled Classes Modal State
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentDetailItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Status Quick Change Dropdown State per row
  const [activeStatusRowId, setActiveStatusRowId] = useState<number | null>(null);
  const [statusDropdownDirection, setStatusDropdownDirection] = useState<'down' | 'up'>('down');

  // CSV Bulk Import States
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<BulkImportResult | null>(null);
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Student Report Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<StudentItem | null>(null);
  const [reportPeriodStart, setReportPeriodStart] = useState<string>('');
  const [reportPeriodEnd, setReportPeriodEnd] = useState<string>('');
  const [reportPreview, setReportPreview] = useState<StudentReport | null>(null);
  const [editableReportMessage, setEditableReportMessage] = useState<string>('');
  const [isLoadingReportPreview, setIsLoadingReportPreview] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(null);

  // Click outside ref
  const modalStatusRef = useRef<HTMLDivElement>(null);
  const rowStatusRef = useRef<HTMLDivElement>(null);
  const classFilterRef = useRef<HTMLDivElement>(null);
  const parentRelRef = useRef<HTMLDivElement>(null);

  // Authentication check
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalStatusRef.current && !modalStatusRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (rowStatusRef.current && !rowStatusRef.current.contains(e.target as Node)) {
        setActiveStatusRowId(null);
      }
      if (classFilterRef.current && !classFilterRef.current.contains(e.target as Node)) {
        setIsClassFilterOpen(false);
      }
      if (parentRelRef.current && !parentRelRef.current.contains(e.target as Node)) {
        setIsParentRelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isClassFilterOpen) {
          setIsClassFilterOpen(false);
          return;
        }
        if (isParentRelOpen) {
          setIsParentRelOpen(false);
          return;
        }
        if (activeStatusRowId !== null) {
          setActiveStatusRowId(null);
          return;
        }
        setIsStudentModalOpen(false);
        setIsDetailModalOpen(false);
        setIsStatusDropdownOpen(false);
        setIsBulkImportModalOpen(false);
        setIsReportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClassFilterOpen, isParentRelOpen, activeStatusRowId]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadStudents = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [studentsRes, classesRes] = await Promise.all([
        studentsService.getStudents({ limit: 100 }),
        classesService.getClasses(),
      ]);
      setStudents(studentsRes.items || []);
      setAvailableClasses(classesRes.items || []);
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
      setFetchError(
        '데이터베이스 또는 서버 연결에 실패하여 원생 및 수업 반 목록을 불러오지 못했습니다. 알림 관리 센터에 시스템 장애 알림이 기록되었습니다.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStudents();
    }
  }, [isAuthenticated]);

  const handleOpenCreateModal = () => {
    setEditingStudent(null);
    setStudentFormData({
      name: '',
      gender: '' as any,
      birthDate: '',
      schoolName: '',
      grade: '',
      studentPhone: '',
      parentPhone: '',
      parentName: '',
      parentRelationship: '모',
      status: 'ACTIVE',
      enrolledAt: new Date().toISOString().split('T')[0],
      memo: '',
    });
    setNameError(null);
    setParentPhoneError(null);
    setStudentFormError(null);
    setIsStatusDropdownOpen(false);
    setIsStudentModalOpen(true);
  };

  const handleOpenEditModal = (student: StudentItem) => {
    setEditingStudent(student);
    setStudentFormData({
      name: student.name,
      gender: (student.gender || '') as any,
      birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
      schoolName: student.schoolName || '',
      grade: student.grade || '',
      studentPhone: student.studentPhone || '',
      parentPhone: student.parentPhone,
      parentName: student.parentName || '',
      parentRelationship: student.parentRelationship || '모',
      status: student.status,
      enrolledAt: student.enrolledAt ? student.enrolledAt.split('T')[0] : new Date().toISOString().split('T')[0],
      memo: student.memo || '',
    });
    setNameError(null);
    setParentPhoneError(null);
    setStudentFormError(null);
    setIsStatusDropdownOpen(false);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    if (!studentFormData.name.trim()) {
      setNameError('원생 이름을 입력해주세요.');
      hasError = true;
    } else {
      setNameError(null);
    }

    if (!studentFormData.parentPhone.trim()) {
      setParentPhoneError('학부모 연락처를 입력해주세요.');
      hasError = true;
    } else {
      setParentPhoneError(null);
    }

    if (hasError) return;

    setIsSubmittingStudent(true);
    setStudentFormError(null);

    try {
      const payload = {
        name: studentFormData.name.trim(),
        gender: studentFormData.gender ? (studentFormData.gender as Gender) : undefined,
        birthDate: studentFormData.birthDate.trim() || undefined,
        schoolName: studentFormData.schoolName.trim() || undefined,
        grade: studentFormData.grade.trim() || undefined,
        studentPhone: studentFormData.studentPhone.trim() || undefined,
        parentPhone: studentFormData.parentPhone.trim(),
        parentName: studentFormData.parentName.trim() || undefined,
        parentRelationship: studentFormData.parentRelationship.trim() || undefined,
        status: studentFormData.status,
        enrolledAt: studentFormData.enrolledAt.trim() || undefined,
        memo: studentFormData.memo.trim() || undefined,
      };

      if (editingStudent) {
        await studentsService.updateStudent(editingStudent.id, payload);
      } else {
        await studentsService.createStudent(payload);
      }

      setIsStudentModalOpen(false);
      await loadStudents();
    } catch (err: any) {
      setStudentFormError(
        err.response?.data?.message || '원생 정보 저장 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // CSV Bulk Import Handlers
  const handleOpenBulkImportModal = () => {
    setIsBulkImportModalOpen(true);
    setSelectedCsvFile(null);
    setBulkImportResult(null);
    setBulkImportError(null);
  };

  const handleDownloadTemplate = () => {
    setIsDownloadingTemplate(true);
    try {
      // UTF-8 BOM (\uFEFF) ensures Korean characters open correctly in MS Excel without broken encoding
      const bom = '\uFEFF';
      const csvContent =
        bom +
        '이름,성별,생년월일,학교명,학년,학생연락처,학부모연락처,학부모이름,학부모관계,재원상태,등록일,메모\n' +
        '김민준,남,2013-05-14,대치중학교,중2,010-1111-2222,010-1234-5678,김영희,모,재원,2026-03-02,형제 할인 대상\n' +
        '이서아,여,2012-08-21,역삼중학교,중3,010-3333-4444,010-8765-4321,이철수,부,재원,2026-03-02,수학 심화반 희망\n';

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '원생_대량등록_표준양식_ClassHelper.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || '템플릿 다운로드에 실패했습니다.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setBulkImportError('CSV 파일(.csv)만 업로드할 수 있습니다.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setBulkImportError('파일 크기는 최대 5MB까지 업로드 가능합니다.');
        return;
      }
      setSelectedCsvFile(file);
      setBulkImportError(null);
      setBulkImportResult(null);
    }
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCsvFile) {
      setBulkImportError('업로드할 CSV 파일을 선택해 주세요.');
      return;
    }

    setIsUploadingCsv(true);
    setBulkImportError(null);
    try {
      const result = await studentsService.bulkImportStudents(selectedCsvFile);
      setBulkImportResult(result);
      await loadStudents();
    } catch (err: any) {
      setBulkImportError(
        err.response?.data?.message || err.message || 'CSV 일괄 등록 중 오류가 발생했습니다.',
      );
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const handleQuickStatusChange = async (studentId: number, newStatus: StudentStatus) => {
    try {
      await studentsService.updateStudentStatus(studentId, { status: newStatus });
      setActiveStatusRowId(null);
      await loadStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || '원생 상태 변경에 실패했습니다.');
    }
  };

  const handleDeleteStudent = async (student: StudentItem) => {
    if (!confirm(`[${student.name}] 원생 정보를 정말 삭제하시겠습니까? 관련 수강/출결 정보가 함께 삭제될 수 있습니다.`)) {
      return;
    }

    try {
      await studentsService.deleteStudent(student.id);
      await loadStudents();
    } catch (err: any) {
      alert(err.response?.data?.message || '원생 삭제에 실패했습니다.');
    }
  };

  const handleOpenDetailModal = async (studentId: number) => {
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    try {
      const data = await studentsService.getStudent(studentId);
      setSelectedStudentForDetail(data);
    } catch (err) {
      console.error('Failed to load student detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleOpenReportModal = async (student: StudentItem | StudentDetailItem) => {
    setSelectedStudentForReport(student as StudentItem);
    setIsReportModalOpen(true);
    setReportSuccessMessage(null);
    setReportErrorMessage(null);
    setReportPreview(null);

    // Default to current month: from 1st of this month to today
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = firstDay.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];

    setReportPeriodStart(startStr);
    setReportPeriodEnd(endStr);

    // Automatically load preview
    fetchReportPreview(student.id, startStr, endStr);
  };

  const fetchReportPreview = async (studentId: number, start: string, end: string) => {
    setIsLoadingReportPreview(true);
    setReportErrorMessage(null);
    try {
      const data = await reportsService.previewStudentReport(studentId, start, end);
      setReportPreview(data);
      setEditableReportMessage(data.message);
    } catch (err: any) {
      console.error('Failed to load report preview:', err);
      setReportErrorMessage(
        err.response?.data?.message || '리포트 미리보기를 생성하지 못했습니다.',
      );
    } finally {
      setIsLoadingReportPreview(false);
    }
  };

  const handleApplyPresetPeriod = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_7_DAYS') => {
    if (!selectedStudentForReport) return;
    const now = new Date();
    let startStr = '';
    let endStr = '';

    if (preset === 'THIS_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      startStr = first.toISOString().split('T')[0];
      endStr = now.toISOString().split('T')[0];
    } else if (preset === 'LAST_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      startStr = first.toISOString().split('T')[0];
      endStr = last.toISOString().split('T')[0];
    } else if (preset === 'LAST_7_DAYS') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      startStr = past7.toISOString().split('T')[0];
      endStr = now.toISOString().split('T')[0];
    }

    setReportPeriodStart(startStr);
    setReportPeriodEnd(endStr);
    fetchReportPreview(selectedStudentForReport.id, startStr, endStr);
  };

  const handleSendStudentReport = async () => {
    if (!selectedStudentForReport || !reportPeriodStart || !reportPeriodEnd) return;

    setIsSendingReport(true);
    setReportErrorMessage(null);
    setReportSuccessMessage(null);

    try {
      const result = await reportsService.sendStudentReport(
        selectedStudentForReport.id,
        reportPeriodStart,
        reportPeriodEnd,
        editableReportMessage,
      );
      setReportSuccessMessage(
        `학부모(${result.sentTo})님께 카카오 알림톡 리포트가 성공적으로 발송되었습니다!`,
      );
    } catch (err: any) {
      console.error('Failed to send report:', err);
      setReportErrorMessage(
        err.response?.data?.message || '리포트 발송 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSendingReport(false);
    }
  };

  // Metrics summary
  const totalCount = students.length;
  const activeCount = students.filter((s) => s.status === 'ACTIVE').length;
  const onLeaveCount = students.filter((s) => s.status === 'ON_LEAVE').length;
  const dischargedCount = students.filter((s) => s.status === 'DISCHARGED').length;

  // Filtered list
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !searchTerm.trim() ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.parentPhone && s.parentPhone.includes(searchTerm)) ||
      (s.studentPhone && s.studentPhone.includes(searchTerm)) ||
      (s.schoolName && s.schoolName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.grade && s.grade.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.parentName && s.parentName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' ? true : s.status === statusFilter;

    const matchesClass =
      classFilter === 'ALL'
        ? true
        : classFilter === 'UNASSIGNED'
        ? !s.enrolledClasses || s.enrolledClasses.length === 0
        : Boolean(s.enrolledClasses?.some((c) => String(c.id) === classFilter));

    const matchesGrade =
      gradeFilter === 'ALL'
        ? true
        : gradeFilter === 'ELEMENTARY'
        ? Boolean(s.grade && (s.grade.includes('초') || s.grade.startsWith('1') || s.grade.startsWith('2') || s.grade.startsWith('3') || s.grade.startsWith('4') || s.grade.startsWith('5') || s.grade.startsWith('6')))
        : gradeFilter === 'MIDDLE'
        ? Boolean(s.grade && s.grade.includes('중'))
        : gradeFilter === 'HIGH'
        ? Boolean(s.grade && s.grade.includes('고'))
        : true;

    return matchesSearch && matchesStatus && matchesClass && matchesGrade;
  });

  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <AppLayout currentPath="/students">
      {/* Main Body Section */}
      <main className="flex-1 relative overflow-hidden py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-7">
          {/* Header Title & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                원생 정보 및 학적 관리
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                원생 등록, 학부모 연락처 및 인적사항 관리, 재원/휴원/퇴원 상태 변경을 원스톱으로 관리하세요.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadStudents}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* CSV Bulk Import Button (SUPER_ADMIN, OWNER, ADMIN) */}
              {(user.role === 'SUPER_ADMIN' || user.role === 'OWNER' || user.role === 'ADMIN') && (
                <button
                  type="button"
                  onClick={handleOpenBulkImportModal}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>CSV 일괄 등록</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>신규 원생 등록</span>
              </button>
            </div>
          </div>

          {/* Metrics Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">전체 원생</span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalCount}<span className="text-sm font-normal text-slate-400 ml-1">명</span>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">재원생</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {activeCount}<span className="text-sm font-normal text-slate-400 ml-1">명</span>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">휴원생</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <UserMinus className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {onLeaveCount}<span className="text-sm font-normal text-slate-400 ml-1">명</span>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">퇴원생</span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <UserX className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {dischargedCount}<span className="text-sm font-normal text-slate-400 ml-1">명</span>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="원생 이름, 학부모/학생 연락처, 학교, 학년 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0 text-xs font-semibold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  전체 ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'ACTIVE'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  재원 ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ON_LEAVE')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'ON_LEAVE'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  휴원 ({onLeaveCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('DISCHARGED')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'DISCHARGED'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  퇴원 ({dischargedCount})
                </button>
              </div>
            </div>

            {/* Filter Controls Row 2 */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-4">
                {/* School Grade Filter Pills */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 mr-1 font-medium text-[11px]">학년 구분:</span>
                  <button
                    type="button"
                    onClick={() => setGradeFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                      gradeFilter === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    전체 학년
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradeFilter('ELEMENTARY')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                      gradeFilter === 'ELEMENTARY'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    초등
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradeFilter('MIDDLE')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                      gradeFilter === 'MIDDLE'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    중등
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradeFilter('HIGH')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                      gradeFilter === 'HIGH'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    고등
                  </button>
                </div>

                {/* Class Filter Custom Floating Dropdown */}
                <div
                  ref={classFilterRef}
                  className={`relative inline-block text-xs ${isClassFilterOpen ? 'z-50' : 'z-20'}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 mr-0.5 font-medium text-[11px]">배정 반:</span>
                    <button
                      type="button"
                      onClick={() => setIsClassFilterOpen(!isClassFilterOpen)}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <span className="truncate max-w-[150px]">
                        {classFilter === 'ALL'
                          ? `전체 반 (${students.length}명)`
                          : classFilter === 'UNASSIGNED'
                          ? `미배정 원생 (${students.filter((s) => !s.enrolledClasses || s.enrolledClasses.length === 0).length}명)`
                          : availableClasses.find((c) => String(c.id) === classFilter)?.name || '반 선택'}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                          isClassFilterOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {isClassFilterOpen && (
                    <div className="absolute top-full left-0 mt-1.5 z-[60] w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 space-y-0.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setClassFilter('ALL');
                          setIsClassFilterOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          classFilter === 'ALL'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>전체 반</span>
                        <span className="text-[10px] text-slate-400 font-normal">{students.length}명</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setClassFilter('UNASSIGNED');
                          setIsClassFilterOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          classFilter === 'UNASSIGNED'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>미배정 원생</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {students.filter((s) => !s.enrolledClasses || s.enrolledClasses.length === 0).length}명
                        </span>
                      </button>

                      {availableClasses.length > 0 && (
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                      )}

                      {availableClasses.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClassFilter(String(c.id));
                            setIsClassFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            classFilter === String(c.id)
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="truncate min-w-0 pr-1">
                            <span className="truncate block font-semibold">{c.name}</span>
                            {c.subject && <span className="text-[10px] text-slate-400 block">{c.subject}</span>}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">{c.enrolledCount}명</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reset Filters Button */}
              {(searchTerm || statusFilter !== 'ALL' || gradeFilter !== 'ALL' || classFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setGradeFilter('ALL');
                    setClassFilter('ALL');
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>필터 초기화</span>
                </button>
              )}
            </div>
          </div>

          {/* Critical DB / Server Connection Error Banner */}
          {fetchError && (
            <div className="p-4 sm:p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950 dark:text-rose-100 flex items-center gap-2">
                    <span>데이터베이스 연결 및 서버 통신 장애</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                      알림 관리 센터 등록됨
                    </span>
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                    {fetchError}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Link
                  href="/notifications"
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                >
                  알림 센터 확인
                </Link>
                <button
                  type="button"
                  onClick={loadStudents}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>다시 시도</span>
                </button>
              </div>
            </div>
          )}

          {/* Student Table */}
          {isLoading ? (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">원생 목록을 불러오는 중입니다...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">등록된 원생이 없습니다</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'ALL' || gradeFilter !== 'ALL' || classFilter !== 'ALL'
                  ? '검색 조건과 일치하는 원생이 없습니다. 필터를 초기화해보세요.'
                  : '새로운 원생을 등록하고 학적 및 수강 관리를 시작해보세요.'}
              </p>
              {!searchTerm && statusFilter === 'ALL' && classFilter === 'ALL' && (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>첫 원생 등록하기</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="py-3.5 px-4 rounded-tl-3xl">원생명</th>
                      <th className="py-3.5 px-4">학년 / 학교</th>
                      <th className="py-3.5 px-4">수강 중인 반</th>
                      <th className="py-3.5 px-4">학부모 연락처</th>
                      <th className="py-3.5 px-4">학생 연락처</th>
                      <th className="py-3.5 px-4">입원일</th>
                      <th className="py-3.5 px-4">재원 상태</th>
                      <th className="py-3.5 px-4 text-right rounded-tr-3xl">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredStudents.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Student Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {s.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{s.name}</span>
                                {s.gender && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({s.gender === 'MALE' ? '남' : '여'})
                                  </span>
                                )}
                              </div>
                              {s.birthDate && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(s.birthDate).toLocaleDateString('ko-KR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Grade / School */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {s.grade || '-'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {s.schoolName || '-'}
                          </div>
                        </td>

                        {/* Enrolled Classes */}
                        <td className="py-3.5 px-4">
                          {s.enrolledClasses && s.enrolledClasses.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {s.enrolledClasses.map((cls) => (
                                <span
                                  key={cls.id}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 truncate max-w-[140px]"
                                >
                                  {cls.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">미배정</span>
                          )}
                        </td>

                        {/* Parent Phone */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{s.parentPhone}</span>
                          </div>
                          {(s.parentName || s.parentRelationship) && (
                            <div className="text-[10px] text-slate-400">
                              {s.parentName ? `${s.parentName} ` : ''}
                              ({s.parentRelationship || '보호자'})
                            </div>
                          )}
                        </td>

                        {/* Student Phone */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {s.studentPhone ? s.studentPhone : <span className="text-slate-400">-</span>}
                        </td>

                        {/* Enrolled At */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {s.enrolledAt ? new Date(s.enrolledAt).toLocaleDateString('ko-KR') : '-'}
                        </td>

                        {/* Status with Inline Quick Change Selector */}
                        <td className={`py-3.5 px-4 ${activeStatusRowId === s.id ? 'relative z-50' : 'relative z-10'}`}>
                          <div className={`relative inline-block ${activeStatusRowId === s.id ? 'z-50' : ''}`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                if (activeStatusRowId === s.id) {
                                  setActiveStatusRowId(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  // Default downward; only flip upward if space below is genuinely tight (< 170px) and more space above
                                  setStatusDropdownDirection(
                                    spaceBelow < 170 && rect.top > spaceBelow ? 'up' : 'down'
                                  );
                                  setActiveStatusRowId(s.id);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                s.status === 'ACTIVE'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100'
                                  : s.status === 'ON_LEAVE'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80 hover:bg-rose-100'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  s.status === 'ACTIVE'
                                    ? 'bg-emerald-500'
                                    : s.status === 'ON_LEAVE'
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                              />
                              <span>
                                {s.status === 'ACTIVE'
                                  ? '재원'
                                  : s.status === 'ON_LEAVE'
                                  ? '휴원'
                                  : '퇴원'}
                              </span>
                              <ChevronDown className="w-3 h-3 opacity-60" />
                            </button>

                            {/* Status Change Dropdown Menu */}
                            {activeStatusRowId === s.id && (
                              <div
                                ref={rowStatusRef}
                                className={`absolute ${
                                  statusDropdownDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                } left-0 z-[60] w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(s.id, 'ACTIVE')}
                                  className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                    s.status === 'ACTIVE'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>재원</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(s.id, 'ON_LEAVE')}
                                  className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                    s.status === 'ON_LEAVE'
                                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>휴원</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(s.id, 'DISCHARGED')}
                                  className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                    s.status === 'DISCHARGED'
                                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span>퇴원</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenReportModal(s)}
                              title="학습/출결 리포트 발송"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
                              aria-label="학습/출결 리포트 발송"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(s.id)}
                              title="수강 반 상세"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                              aria-label="수강 반 조회"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(s)}
                              title="원생 정보 수정"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              aria-label="원생 정보 수정"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(s)}
                              title="원생 삭제"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              aria-label="원생 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================== */}
      {/* 1. Student Create / Edit Modal */}
      {/* ========================================== */}
      {isStudentModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsStudentModalOpen(false);
              setIsStatusDropdownOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {editingStudent ? '원생 정보 수정' : '신규 원생 등록'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStudentModalOpen(false);
                  setIsStatusDropdownOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStudent} noValidate className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                {studentFormError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{studentFormError}</span>
                  </div>
                )}

                {/* Name & Gender */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      원생 이름 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="예: 홍길동"
                      value={studentFormData.name}
                      onChange={(e) => {
                        setStudentFormData({ ...studentFormData, name: e.target.value });
                        if (nameError) setNameError(null);
                      }}
                      className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none transition-all ${
                        nameError
                          ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                      }`}
                    />
                    {nameError && (
                      <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{nameError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      성별
                    </label>
                    <div className="flex p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl h-[42px] items-center">
                      {[
                        { value: '', label: '미지정' },
                        { value: 'MALE', label: '남' },
                        { value: 'FEMALE', label: '여' },
                      ].map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setStudentFormData({ ...studentFormData, gender: g.value as Gender })}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            studentFormData.gender === g.value
                              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Grade & School */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      대상 학년
                    </label>
                    <input
                      type="text"
                      placeholder="예: 초6, 중2, 고1"
                      value={studentFormData.grade}
                      onChange={(e) => setStudentFormData({ ...studentFormData, grade: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      재학 중인 학교
                    </label>
                    <input
                      type="text"
                      placeholder="예: 대치중학교"
                      value={studentFormData.schoolName}
                      onChange={(e) =>
                        setStudentFormData({ ...studentFormData, schoolName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Parent Phone & Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      학부모 연락처 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="예: 010-1234-5678"
                      value={studentFormData.parentPhone}
                      onChange={(e) => {
                        setStudentFormData({ ...studentFormData, parentPhone: e.target.value });
                        if (parentPhoneError) setParentPhoneError(null);
                      }}
                      className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none transition-all ${
                        parentPhoneError
                          ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20'
                          : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                      }`}
                    />
                    {parentPhoneError && (
                      <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{parentPhoneError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      보호자 성함 / 관계
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="성함 (예: 김영희)"
                        value={studentFormData.parentName}
                        onChange={(e) =>
                          setStudentFormData({ ...studentFormData, parentName: e.target.value })
                        }
                        className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <div
                        ref={parentRelRef}
                        className={`relative ${isParentRelOpen ? 'z-50' : 'z-20'}`}
                      >
                        <button
                          type="button"
                          onClick={() => setIsParentRelOpen(!isParentRelOpen)}
                          className="w-20 px-2.5 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                        >
                          <span>{studentFormData.parentRelationship || '모'}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                              isParentRelOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                            }`}
                          />
                        </button>

                        {isParentRelOpen && (
                          <div className="absolute right-0 top-full mt-1.5 z-[60] w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                            {['모', '부', '조모', '조부', '기타'].map((rel) => (
                              <button
                                key={rel}
                                type="button"
                                onClick={() => {
                                  setStudentFormData({ ...studentFormData, parentRelationship: rel });
                                  setIsParentRelOpen(false);
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                  studentFormData.parentRelationship === rel
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {rel}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Phone & BirthDate */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      학생 본인 연락처
                    </label>
                    <input
                      type="text"
                      placeholder="예: 010-9876-5432"
                      value={studentFormData.studentPhone}
                      onChange={(e) =>
                        setStudentFormData({ ...studentFormData, studentPhone: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      생년월일
                    </label>
                    <CustomDatePicker
                      value={studentFormData.birthDate}
                      onChange={(val) => setStudentFormData({ ...studentFormData, birthDate: val })}
                      placeholder="YYYY-MM-DD"
                      showTodayShortcut={false}
                      align="right"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Enrolled Date & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      입원일 (학원 등록일)
                    </label>
                    <CustomDatePicker
                      value={studentFormData.enrolledAt}
                      onChange={(val) => setStudentFormData({ ...studentFormData, enrolledAt: val })}
                      placeholder="YYYY-MM-DD"
                      showTodayShortcut={true}
                      className="w-full"
                    />
                  </div>

                  {/* Status Selector */}
                  <div ref={modalStatusRef}>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      학적 상태
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-xs hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <div className="flex items-center gap-2">
                        {studentFormData.status === 'ACTIVE' && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"></span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">재원 (정상)</span>
                          </>
                        )}
                        {studentFormData.status === 'ON_LEAVE' && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs"></span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">휴원</span>
                          </>
                        )}
                        {studentFormData.status === 'DISCHARGED' && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs"></span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">퇴원</span>
                          </>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          isStatusDropdownOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                        }`}
                      />
                    </button>

                    {/* Expandable Status Options */}
                    {isStatusDropdownOpen && (
                      <div className="mt-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <button
                          type="button"
                          onClick={() => {
                            setStudentFormData({ ...studentFormData, status: 'ACTIVE' });
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                            studentFormData.status === 'ACTIVE'
                              ? 'bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/80 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs'
                              : 'hover:bg-white/60 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>재원 (수업 및 출결 가능)</span>
                          </div>
                          {studentFormData.status === 'ACTIVE' && (
                            <span className="text-[10px] text-emerald-600 font-bold">선택됨</span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStudentFormData({ ...studentFormData, status: 'ON_LEAVE' });
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                            studentFormData.status === 'ON_LEAVE'
                              ? 'bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-200 font-bold shadow-xs'
                              : 'hover:bg-white/60 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <PauseCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>휴원 (일정 기간 수업 보류)</span>
                          </div>
                          {studentFormData.status === 'ON_LEAVE' && (
                            <span className="text-[10px] text-amber-600 font-bold">선택됨</span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStudentFormData({ ...studentFormData, status: 'DISCHARGED' });
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                            studentFormData.status === 'DISCHARGED'
                              ? 'bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700/80 text-rose-950 dark:text-rose-200 font-bold shadow-xs'
                              : 'hover:bg-white/60 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>퇴원 (학원 종료)</span>
                          </div>
                          {studentFormData.status === 'DISCHARGED' && (
                            <span className="text-[10px] text-rose-600 font-bold">선택됨</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Memo */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    특이사항 및 상담 메모
                  </label>
                  <textarea
                    rows={3}
                    placeholder="원생의 학습 성향, 희망 진도, 특이사항 등을 기록하세요."
                    value={studentFormData.memo}
                    onChange={(e) => setStudentFormData({ ...studentFormData, memo: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/80 dark:bg-slate-900/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsStudentModalOpen(false);
                    setIsStatusDropdownOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStudent}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm shadow-indigo-600/20 text-xs"
                >
                  {isSubmittingStudent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStudent ? '수정 완료' : '원생 등록하기'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. Student Detail & Enrolled Classes Modal */}
      {/* ========================================== */}
      {isDetailModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDetailModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedStudentForDetail?.name || '원생 상세 정보'}</span>
                    {selectedStudentForDetail?.status && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          selectedStudentForDetail.status === 'ACTIVE'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                            : selectedStudentForDetail.status === 'ON_LEAVE'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80'
                        }`}
                      >
                        {selectedStudentForDetail.status === 'ACTIVE'
                          ? '재원'
                          : selectedStudentForDetail.status === 'ON_LEAVE'
                          ? '휴원'
                          : '퇴원'}
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {isLoadingDetail || !selectedStudentForDetail ? (
                <div className="py-20 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <span>원생 상세 정보를 불러오는 중...</span>
                </div>
              ) : (
                <>
                  {/* Basic Profile Grid */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>기본 인적사항 및 연락처</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">학년 / 학교</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedStudentForDetail.grade || '-'} ({selectedStudentForDetail.schoolName || '-'})
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">학부모 연락처</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedStudentForDetail.parentPhone}{' '}
                          <span className="text-slate-400 font-normal">
                            ({selectedStudentForDetail.parentRelationship || '보호자'})
                          </span>
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">학생 연락처</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedStudentForDetail.studentPhone || '-'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">생년월일</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedStudentForDetail.birthDate
                            ? new Date(selectedStudentForDetail.birthDate).toLocaleDateString('ko-KR')
                            : '-'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">입원일</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedStudentForDetail.enrolledAt
                            ? new Date(selectedStudentForDetail.enrolledAt).toLocaleDateString('ko-KR')
                            : '-'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">특이사항 메모</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                          {selectedStudentForDetail.memo || '기록 없음'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enrolled Classes List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>수강 중인 반 목록 ({selectedStudentForDetail.classes?.length || 0}개)</span>
                      </h4>

                      <Link
                        href="/classes"
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>반 배정 관리로 이동</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {(!selectedStudentForDetail.classes || selectedStudentForDetail.classes.length === 0) ? (
                      <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                        현재 수강 중인 수업 반이 없습니다.
                      </div>
                    ) : (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                              <th className="py-2.5 px-3">반 명칭</th>
                              <th className="py-2.5 px-3">과목</th>
                              <th className="py-2.5 px-3">담당 강사</th>
                              <th className="py-2.5 px-3">수강 시작일</th>
                              <th className="py-2.5 px-3 text-right">수강 상태</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {selectedStudentForDetail.classes.map((cls) => (
                              <tr key={cls.enrollmentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                  {cls.className}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                  {cls.subject || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                  {cls.teacherName || '강사 미지정'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                  {new Date(cls.startDate).toLocaleDateString('ko-KR')}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                      cls.status === 'ENROLLED'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                        : cls.status === 'COMPLETED'
                                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {cls.status === 'ENROLLED'
                                      ? '수강중'
                                      : cls.status === 'COMPLETED'
                                      ? '종강'
                                      : cls.status === 'DROPPED'
                                      ? '중도퇴반'
                                      : '일시정지'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => {
                  if (selectedStudentForDetail) {
                    setIsDetailModalOpen(false);
                    handleOpenReportModal(selectedStudentForDetail);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800/80 cursor-pointer text-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>카카오 학습 리포트 발송</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CSV Bulk Import Modal */}
      {isBulkImportModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUploadingCsv) {
              setIsBulkImportModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] animate-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    원생 CSV 대량 일괄 등록
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    엑셀/CSV 파일로 수백 명의 원생을 한 번에 안전하게 등록하세요.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBulkImportModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {bulkImportError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">업로드 실패: </span>
                    <span>{bulkImportError}</span>
                  </div>
                </div>
              )}

              {/* View 1: Upload Form & Guide (when no result yet) */}
              {!bulkImportResult ? (
                <div className="space-y-5">
                  {/* Template Download Section */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>표준 CSV 양식 템플릿 다운로드</span>
                      </div>
                      <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                        헤더 컬럼 규격과 예시 데이터가 포함된 표준 CSV 파일을 먼저 받아보세요.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      disabled={isDownloadingTemplate}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0"
                    >
                      {isDownloadingTemplate ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>양식 템플릿 다운로드</span>
                    </button>
                  </div>

                  {/* Drag & Drop / File Input Box */}
                  <form onSubmit={handleBulkImportSubmit} className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                        selectedCsvFile
                          ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                          selectedCsvFile
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {selectedCsvFile ? (
                          <FileSpreadsheet className="w-6 h-6" />
                        ) : (
                          <UploadCloud className="w-6 h-6" />
                        )}
                      </div>

                      {selectedCsvFile ? (
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {selectedCsvFile.name}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {(selectedCsvFile.size / 1024).toFixed(1)} KB • 클릭하여 다른 파일 선택
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            이곳을 클릭하거나 CSV 파일을 드래그하여 업로드하세요
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            최대 5MB, 최대 2,000행까지 지원됩니다 (.csv 파일만 가능)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Column Guide Help */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-2">
                      <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>CSV 작성 필수 규격 안내</span>
                      </p>
                      <ul className="list-disc list-inside space-y-1.5 text-slate-500 dark:text-slate-400">
                        <li>
                          <strong className="text-slate-700 dark:text-slate-300">필수 항목:</strong> 이름, 학부모연락처 (예: 010-1234-5678)
                        </li>
                        <li>
                          <strong className="text-slate-700 dark:text-slate-300">성별 표기:</strong> <span className="font-bold text-indigo-600 dark:text-indigo-400">남</span> 또는 <span className="font-bold text-indigo-600 dark:text-indigo-400">여</span> (MALE / FEMALE 도 가능)
                        </li>
                        <li>
                          <strong className="text-slate-700 dark:text-slate-300">재원상태 표기:</strong> <span className="font-bold text-emerald-600 dark:text-emerald-400">재원</span>, <span className="font-bold text-amber-600 dark:text-amber-400">휴원</span>, <span className="font-bold text-rose-600 dark:text-rose-400">퇴원</span> (미입력 시 자동으로 '재원'으로 등록)
                        </li>
                        <li>
                          <strong className="text-slate-700 dark:text-slate-300">날짜 형식:</strong> 생년월일 및 등록일은 <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">YYYY-MM-DD</span> (예: 2013-05-14) 형식 준수
                        </li>
                        <li>
                          <strong className="text-slate-700 dark:text-slate-300">중복 방지:</strong> 이미 등록된 원생(동일 이름 & 학부모연락처)은 중복 생성되지 않고 안전하게 건너뜁니다.
                        </li>
                      </ul>
                    </div>

                    <div className="pt-2 flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsBulkImportModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedCsvFile || isUploadingCsv}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                      >
                        {isUploadingCsv ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>데이터 검증 및 등록 중...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>원생 데이터 일괄 등록 시작</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* View 2: Result Report */
                <div className="space-y-6">
                  {/* Summary KPI Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">총 데이터 행</span>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                        {bulkImportResult.totalRows}건
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center">
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">신규 등록 성공</span>
                      <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        {bulkImportResult.createdCount}건
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-center">
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 block font-semibold">중복 건너뜀</span>
                      <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block">
                        {bulkImportResult.skippedCount}건
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-center">
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 block font-semibold">검증 실패</span>
                      <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 block">
                        {bulkImportResult.failedCount}건
                      </span>
                    </div>
                  </div>

                  {/* Skipped Details Table (if any) */}
                  {bulkImportResult.skipped.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>중복 건너뜀 상세 내역 ({bulkImportResult.skipped.length}건)</span>
                      </h4>
                      <div className="max-h-36 overflow-y-auto rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-amber-100/60 dark:bg-amber-900/40 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                            <tr>
                              <th className="py-2 px-3">행</th>
                              <th className="py-2 px-3">원생명</th>
                              <th className="py-2 px-3">사유</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100 dark:divide-amber-900/40 text-[11px] text-amber-950 dark:text-amber-200">
                            {bulkImportResult.skipped.map((s, idx) => (
                              <tr key={idx}>
                                <td className="py-1.5 px-3 font-semibold">{s.row}행</td>
                                <td className="py-1.5 px-3 font-bold">{s.name}</td>
                                <td className="py-1.5 px-3">{s.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Failed Details Table (if any) */}
                  {bulkImportResult.failed.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>검증 실패 상세 내역 ({bulkImportResult.failed.length}건)</span>
                      </h4>
                      <div className="max-h-36 overflow-y-auto rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-rose-100/60 dark:bg-rose-900/40 text-[11px] font-bold text-rose-900 dark:text-rose-200">
                            <tr>
                              <th className="py-2 px-3">행</th>
                              <th className="py-2 px-3">원생명</th>
                              <th className="py-2 px-3">오류 내용</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-rose-100 dark:divide-rose-900/40 text-[11px] text-rose-950 dark:text-rose-200">
                            {bulkImportResult.failed.map((f, idx) => (
                              <tr key={idx}>
                                <td className="py-1.5 px-3 font-semibold">{f.row}행</td>
                                <td className="py-1.5 px-3 font-bold">{f.name || '(이름 누락)'}</td>
                                <td className="py-1.5 px-3 text-rose-600 dark:text-rose-400">
                                  {f.errors.join(', ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Modal Action Buttons */}
                  <div className="pt-2 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkImportResult(null);
                        setSelectedCsvFile(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
                    >
                      다른 파일 추가 등록
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkImportModalOpen(false)}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>완료 및 원생 목록 닫기</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. Student Report (Kakao) Modal           */}
      {/* ========================================== */}
      {isReportModalOpen && selectedStudentForReport && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSendingReport) {
              setIsReportModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold border border-purple-200 dark:border-purple-800/80">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>학습 & 출결 리포트 발송</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold">
                      {selectedStudentForReport.name} 학생
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    학부모({selectedStudentForReport.parentPhone || '연락처 없음'})님께 카카오 알림톡으로 전송합니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                disabled={isSendingReport}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* 1. Period Selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>조회 및 리포트 대상 기간</span>
                  <span className="text-[11px] text-slate-400 font-normal">프리셋을 클릭하면 즉시 적용됩니다</span>
                </label>

                {/* Preset Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPresetPeriod('THIS_MONTH')}
                    className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center"
                  >
                    이번 달
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetPeriod('LAST_MONTH')}
                    className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center"
                  >
                    지난 달
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetPeriod('LAST_7_DAYS')}
                    className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center"
                  >
                    최근 7일
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="date"
                    value={reportPeriodStart}
                    onChange={(e) => setReportPeriodStart(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                  <span className="text-slate-400 font-bold">~</span>
                  <input
                    type="date"
                    value={reportPeriodEnd}
                    onChange={(e) => setReportPeriodEnd(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentForReport && reportPeriodStart && reportPeriodEnd) {
                        fetchReportPreview(selectedStudentForReport.id, reportPeriodStart, reportPeriodEnd);
                      }
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer shrink-0 transition-colors"
                  >
                    새로고침
                  </button>
                </div>
              </div>

              {/* 2. Success or Error Message Alert */}
              {reportSuccessMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">발송 완료</p>
                    <p className="text-[11px] mt-0.5">{reportSuccessMessage}</p>
                  </div>
                </div>
              )}

              {reportErrorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">발송 불가 또는 오류</p>
                    <p className="text-[11px] mt-0.5">{reportErrorMessage}</p>
                  </div>
                </div>
              )}

              {/* 3. Report Live Preview */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>카카오 발송 내용 실시간 미리보기</span>
                </label>

                {isLoadingReportPreview ? (
                  <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>출결 및 과제 데이터를 집계하여 리포트를 생성하는 중...</span>
                  </div>
                ) : reportPreview ? (
                  <div className="space-y-3">
                    {/* Summary Stat Chips */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                        <span className="text-[10px] text-slate-400 font-medium">출석률</span>
                        <div className="flex items-baseline justify-between mt-0.5">
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">
                            {reportPreview.attendance.attendanceRate}%
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            출석 {reportPreview.attendance.presentCount}/{reportPreview.attendance.totalDays}일
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex gap-1.5">
                          <span>지각: {reportPreview.attendance.lateCount}</span>
                          <span>•</span>
                          <span>결석: {reportPreview.attendance.absentCount}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                        <span className="text-[10px] text-slate-400 font-medium">과제 이행률</span>
                        <div className="flex items-baseline justify-between mt-0.5">
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">
                            {reportPreview.homework.completionRate}%
                          </span>
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            완료 {reportPreview.homework.completedAssignments}/{reportPreview.homework.totalAssignments}건
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          평균 점수: {reportPreview.homework.averageScore ? `${reportPreview.homework.averageScore}점` : '평가 없음'}
                        </div>
                      </div>
                    </div>

                    {/* Live Message Edit + Kakao Bubble Preview */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>카카오 알림톡 발송 메시지 직접 수정</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditableReportMessage(reportPreview.message)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 font-semibold cursor-pointer"
                          title="자동 계산된 기본 텍스트로 초기화"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>기본 문구로 초기화</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Editor */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-medium block">메시지 내용 편집</span>
                          <textarea
                            rows={7}
                            value={editableReportMessage}
                            onChange={(e) => setEditableReportMessage(e.target.value)}
                            placeholder="발송할 알림톡 본문을 확인하고 수정하세요..."
                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 leading-relaxed transition-all resize-none"
                          />
                        </div>

                        {/* Kakao Preview Bubble */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-medium block">실제 학부모 수신 화면</span>
                          <div className="p-3.5 rounded-2xl bg-[#FAE100]/25 dark:bg-[#FAE100]/10 border border-[#FAE100] dark:border-amber-700/60 max-h-44 overflow-y-auto font-sans text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed shadow-xs">
                            {editableReportMessage || '메시지 본문이 여기에 표시됩니다.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    기간을 선택한 후 리포트를 조회해주세요.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                disabled={isSendingReport}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
              >
                닫기
              </button>

              <button
                type="button"
                onClick={handleSendStudentReport}
                disabled={isSendingReport || !reportPreview || isLoadingReportPreview}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingReport ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>카카오 발송 중...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>카카오 알림톡으로 발송</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
