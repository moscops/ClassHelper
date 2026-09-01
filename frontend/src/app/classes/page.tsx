'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Users,
  Plus,
  Search,
  Clock,
  CreditCard,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  UserPlus,
  ChevronDown,
  PauseCircle,
  FileText,
  Send,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  classesService,
  ClassItem,
  ClassStatus,
  EnrollmentItem,
  EnrollmentStatus,
} from '@/lib/classes-service';
import { studentsService, StudentItem } from '@/lib/students-service';
import { reportsService, ClassReportSendResult } from '@/lib/reports-service';
import { CustomDatePicker } from '@/components/CustomDatePicker';
import { AppLayout } from '@/components/common/AppLayout';

export default function ClassesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClassStatus>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [dayFilter, setDayFilter] = useState<string>('ALL');

  // Class Create / Edit Modal State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classFormData, setClassFormData] = useState({
    name: '',
    subject: '',
    targetGrade: '',
    schedule: '',
    capacity: '' as any,
    monthlyFee: '' as any,
    status: 'ACTIVE' as ClassStatus,
  });
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);
  const [classFormError, setClassFormError] = useState<string | null>(null);

  // Enrollment Management Modal State
  const [selectedClassForEnrollment, setSelectedClassForEnrollment] = useState<ClassItem | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);
  const [selectedStudentIdToEnroll, setSelectedStudentIdToEnroll] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState<boolean>(false);
  const [activeEnrollmentStatusRowId, setActiveEnrollmentStatusRowId] = useState<number | null>(null);
  const [enrollmentStatusDropdownDirection, setEnrollmentStatusDropdownDirection] = useState<'down' | 'up'>('down');
  const [enrollStartDate, setEnrollStartDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [isEnrollingStudent, setIsEnrollingStudent] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Class Report Bulk Send Modal States
  const [isClassReportModalOpen, setIsClassReportModalOpen] = useState(false);
  const [selectedClassForReport, setSelectedClassForReport] = useState<ClassItem | null>(null);
  const [classReportStart, setClassReportStart] = useState<string>('');
  const [classReportEnd, setClassReportEnd] = useState<string>('');
  const [classReportSamplePreview, setClassReportSamplePreview] = useState<any | null>(null);
  const [classReportCustomNote, setClassReportCustomNote] = useState<string>('');
  const [isLoadingClassReportPreview, setIsLoadingClassReportPreview] = useState(false);
  const [isSendingClassReport, setIsSendingClassReport] = useState(false);
  const [classReportResult, setClassReportResult] = useState<ClassReportSendResult | null>(null);
  const [classReportError, setClassReportError] = useState<string | null>(null);

  // Click Outside Dropdown Refs
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const studentSearchRef = useRef<HTMLDivElement>(null);
  const enrollmentRowStatusRef = useRef<HTMLDivElement>(null);

  // Authentication check
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Click Outside Listener to Close Dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusDropdownOpen(false);
      }
      if (
        studentSearchRef.current &&
        !studentSearchRef.current.contains(event.target as Node)
      ) {
        setIsStudentDropdownOpen(false);
      }
      if (
        enrollmentRowStatusRef.current &&
        !enrollmentRowStatusRef.current.contains(event.target as Node)
      ) {
        setActiveEnrollmentStatusRowId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC Key Modal Close Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeEnrollmentStatusRowId !== null) {
          setActiveEnrollmentStatusRowId(null);
          return;
        }
        if (isStudentDropdownOpen) {
          setIsStudentDropdownOpen(false);
          return;
        }
        setIsClassModalOpen(false);
        setIsEnrollmentModalOpen(false);
        setIsStatusDropdownOpen(false);
        setIsClassReportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudentDropdownOpen, activeEnrollmentStatusRowId]);

  const loadClasses = async () => {
    setIsLoading(true);
    try {
      const response = await classesService.getClasses();
      setClasses(response.items || []);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const response = await studentsService.getStudents({ limit: 100 });
      setAllStudents(response.items || []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadClasses();
      loadStudents();
    }
  }, [isAuthenticated]);

  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setClassFormData({
      name: '',
      subject: '',
      targetGrade: '',
      schedule: '',
      capacity: '' as any,
      monthlyFee: '' as any,
      status: 'ACTIVE',
    });
    setIsStatusDropdownOpen(false);
    setNameError(null);
    setClassFormError(null);
    setIsClassModalOpen(true);
  };

  const handleOpenEditModal = (classItem: ClassItem) => {
    setEditingClass(classItem);
    setClassFormData({
      name: classItem.name,
      subject: classItem.subject || '',
      targetGrade: classItem.targetGrade || '',
      schedule: classItem.schedule || '',
      capacity: classItem.capacity || ('' as any),
      monthlyFee: classItem.monthlyFee || ('' as any),
      status: classItem.status,
    });
    setIsStatusDropdownOpen(false);
    setNameError(null);
    setClassFormError(null);
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFormData.name.trim()) {
      setNameError('반 명칭을 입력해주세요.');
      return;
    }

    setNameError(null);
    setIsSubmittingClass(true);
    setClassFormError(null);

    try {
      const payload = {
        name: classFormData.name.trim(),
        subject: classFormData.subject.trim() || undefined,
        targetGrade: classFormData.targetGrade.trim() || undefined,
        schedule: classFormData.schedule.trim() || undefined,
        capacity: classFormData.capacity ? Number(classFormData.capacity) : undefined,
        monthlyFee: classFormData.monthlyFee ? Number(classFormData.monthlyFee) : 0,
        status: classFormData.status,
      };

      if (editingClass) {
        await classesService.updateClass(editingClass.id, payload);
      } else {
        await classesService.createClass(payload);
      }
      setIsClassModalOpen(false);
      await loadClasses();
    } catch (err: any) {
      setClassFormError(
        err.response?.data?.message || '반 저장 처리 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSubmittingClass(false);
    }
  };

  const handleDeleteClass = async (classItem: ClassItem) => {
    if (!confirm(`[${classItem.name}] 반을 정말 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await classesService.deleteClass(classItem.id);
      await loadClasses();
    } catch (err: any) {
      alert(err.response?.data?.message || '반 삭제 중 오류가 발생했습니다.');
    }
  };

  // Open Enrollment Modal
  const handleOpenEnrollmentModal = async (classItem: ClassItem) => {
    setSelectedClassForEnrollment(classItem);
    setIsEnrollmentModalOpen(true);
    setIsLoadingEnrollments(true);
    setEnrollError(null);
    setSelectedStudentIdToEnroll('');
    setStudentSearchTerm('');
    setIsStudentDropdownOpen(false);

    try {
      const data = await classesService.getEnrolledStudents(classItem.id);
      setEnrollments(data || []);
    } catch (err) {
      console.error('Failed to load enrollments:', err);
    } finally {
      setIsLoadingEnrollments(false);
    }
  };

  // Add student enrollment
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForEnrollment || !selectedStudentIdToEnroll) {
      setEnrollError('배정할 원생을 검색하여 선택해주세요.');
      setIsStudentDropdownOpen(true);
      return;
    }

    setIsEnrollingStudent(true);
    setEnrollError(null);

    try {
      await classesService.enrollStudent(selectedClassForEnrollment.id, {
        studentId: Number(selectedStudentIdToEnroll),
        startDate: enrollStartDate.trim() || new Date().toISOString().split('T')[0],
      });

      // Refresh enrollments & class count
      const updated = await classesService.getEnrolledStudents(selectedClassForEnrollment.id);
      setEnrollments(updated || []);
      setSelectedStudentIdToEnroll('');
      setStudentSearchTerm('');
      setIsStudentDropdownOpen(false);
      await loadClasses();
    } catch (err: any) {
      setEnrollError(err.response?.data?.message || '수강 등록 중 오류가 발생했습니다.');
    } finally {
      setIsEnrollingStudent(false);
    }
  };

  // Change enrollment status (e.g. DROPPED, COMPLETED)
  const handleUpdateEnrollmentStatus = async (
    enrollmentId: number,
    newStatus: EnrollmentStatus,
  ) => {
    try {
      await classesService.updateEnrollment(enrollmentId, { status: newStatus });
      if (selectedClassForEnrollment) {
        const updated = await classesService.getEnrolledStudents(selectedClassForEnrollment.id);
        setEnrollments(updated || []);
        await loadClasses();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '수강 상태 변경에 실패했습니다.');
    }
  };

  // Remove enrollment
  const handleRemoveEnrollment = async (enrollmentId: number, studentName: string) => {
    if (!confirm(`[${studentName}] 학생의 수강 등록을 취소/삭제하시겠습니까?`)) {
      return;
    }

    try {
      await classesService.removeEnrollment(enrollmentId);
      if (selectedClassForEnrollment) {
        const updated = await classesService.getEnrolledStudents(selectedClassForEnrollment.id);
        setEnrollments(updated || []);
        await loadClasses();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '수강 삭제에 실패했습니다.');
    }
  };

  const getSubjectColor = (subject?: string | null) => {
    switch (subject) {
      case '수학':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case '영어':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case '국어':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case '과학':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const fetchClassSamplePreview = async (classId: number, start: string, end: string) => {
    setIsLoadingClassReportPreview(true);
    try {
      const enrollments = await classesService.getEnrolledStudents(classId);
      if (enrollments && enrollments.length > 0) {
        const firstStudentId = enrollments[0].student.id;
        const preview = await reportsService.previewStudentReport(firstStudentId, start, end);
        setClassReportSamplePreview(preview);
      } else {
        setClassReportSamplePreview(null);
      }
    } catch (err) {
      console.error('Failed to load class sample preview:', err);
    } finally {
      setIsLoadingClassReportPreview(false);
    }
  };

  const handleOpenClassReportModal = (cls: ClassItem) => {
    setSelectedClassForReport(cls);
    setIsClassReportModalOpen(true);
    setClassReportResult(null);
    setClassReportError(null);
    setClassReportSamplePreview(null);
    setClassReportCustomNote('');

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const startStr = firstDay.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];
    setClassReportStart(startStr);
    setClassReportEnd(endStr);
    fetchClassSamplePreview(cls.id, startStr, endStr);
  };

  const handleApplyClassPreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_7_DAYS') => {
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

    setClassReportStart(startStr);
    setClassReportEnd(endStr);
    if (selectedClassForReport) {
      fetchClassSamplePreview(selectedClassForReport.id, startStr, endStr);
    }
  };

  const handleSendClassReport = async () => {
    if (!selectedClassForReport || !classReportStart || !classReportEnd) return;

    setIsSendingClassReport(true);
    setClassReportError(null);
    setClassReportResult(null);

    try {
      const result = await reportsService.sendClassReports(
        selectedClassForReport.id,
        classReportStart,
        classReportEnd,
        classReportCustomNote,
      );
      setClassReportResult(result);
    } catch (err: any) {
      console.error('Failed to send class reports:', err);
      setClassReportError(
        err.response?.data?.message || '반 리포트 일괄 발송 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSendingClassReport(false);
    }
  };

  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      !searchTerm.trim() ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.subject && c.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.targetGrade && c.targetGrade.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.schedule && c.schedule.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' ? true : c.status === statusFilter;

    const matchesSubject =
      subjectFilter === 'ALL'
        ? true
        : subjectFilter === 'OTHER'
        ? !c.subject || !['수학', '영어', '국어', '과학'].includes(c.subject)
        : c.subject === subjectFilter;

    const matchesGrade =
      gradeFilter === 'ALL'
        ? true
        : gradeFilter === 'ELEMENTARY'
        ? Boolean(c.targetGrade && (c.targetGrade.includes('초') || c.targetGrade.startsWith('1') || c.targetGrade.startsWith('2') || c.targetGrade.startsWith('3') || c.targetGrade.startsWith('4') || c.targetGrade.startsWith('5') || c.targetGrade.startsWith('6')))
        : gradeFilter === 'MIDDLE'
        ? Boolean(c.targetGrade && c.targetGrade.includes('중'))
        : gradeFilter === 'HIGH'
        ? Boolean(c.targetGrade && c.targetGrade.includes('고'))
        : true;

    const matchesDay =
      dayFilter === 'ALL'
        ? true
        : dayFilter === 'MON'
        ? Boolean(c.schedule && c.schedule.includes('월'))
        : dayFilter === 'TUE'
        ? Boolean(c.schedule && c.schedule.includes('화'))
        : dayFilter === 'WED'
        ? Boolean(c.schedule && c.schedule.includes('수'))
        : dayFilter === 'THU'
        ? Boolean(c.schedule && c.schedule.includes('목'))
        : dayFilter === 'FRI'
        ? Boolean(c.schedule && c.schedule.includes('금'))
        : dayFilter === 'SAT'
        ? Boolean(c.schedule && c.schedule.includes('토'))
        : dayFilter === 'SUN'
        ? Boolean(c.schedule && c.schedule.includes('일'))
        : dayFilter === 'WEEKDAY'
        ? Boolean(c.schedule && (c.schedule.includes('월') || c.schedule.includes('화') || c.schedule.includes('수') || c.schedule.includes('목') || c.schedule.includes('금') || c.schedule.includes('평일')))
        : dayFilter === 'WEEKEND'
        ? Boolean(c.schedule && (c.schedule.includes('토') || c.schedule.includes('일') || c.schedule.includes('주말')))
        : true;

    return matchesSearch && matchesStatus && matchesSubject && matchesGrade && matchesDay;
  });

  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <AppLayout currentPath="/classes">
      {/* Main Body Section */}
      <main className="flex-1 relative overflow-hidden py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-7">
          {/* Header Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                수업 반 및 수강생 배정 관리
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                과목별, 학년별 반을 개설하고 수강 정원 및 학생 배정을 원스톱으로 관리하세요.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadClasses}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>신규 반 개설</span>
              </button>
            </div>
          </div>

          {/* Search & Filters Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            {/* Top Row: Search & Status Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="반 명칭, 과목, 학년, 수업 시간표 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
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

              {/* Status Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0 text-xs font-semibold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  전체 ({classes.length})
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
                  운영중 ({classes.filter((c) => c.status === 'ACTIVE').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'INACTIVE'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  임시휴강 ({classes.filter((c) => c.status === 'INACTIVE').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('CLOSED')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'CLOSED'
                      ? 'bg-white dark:bg-slate-900 text-slate-500 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  폐강 ({classes.filter((c) => c.status === 'CLOSED').length})
                </button>
              </div>
            </div>

            {/* Bottom Rows: Subject, Grade, Day Filters */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
              {/* Row 1: Subject & Grade */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Subject Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 mr-1 font-medium text-[11px]">과목 구분:</span>
                    {['ALL', '수학', '영어', '국어', '과학', 'OTHER'].map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => setSubjectFilter(subj)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                          subjectFilter === subj
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {subj === 'ALL' ? '전체 과목' : subj === 'OTHER' ? '기타 과목' : subj}
                      </button>
                    ))}
                  </div>

                  {/* Grade Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 mr-1 font-medium text-[11px]">대상 학년:</span>
                    {[
                      { id: 'ALL', label: '전체 학년' },
                      { id: 'ELEMENTARY', label: '초등' },
                      { id: 'MIDDLE', label: '중등' },
                      { id: 'HIGH', label: '고등' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGradeFilter(g.id)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                          gradeFilter === g.id
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset Filters */}
                {(searchTerm || statusFilter !== 'ALL' || subjectFilter !== 'ALL' || gradeFilter !== 'ALL' || dayFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                      setSubjectFilter('ALL');
                      setGradeFilter('ALL');
                      setDayFilter('ALL');
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>필터 초기화</span>
                  </button>
                )}
              </div>

              {/* Row 2: Day/Schedule Filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 mr-1 font-medium text-[11px]">수업 요일:</span>
                {[
                  { id: 'ALL', label: '전체 요일' },
                  { id: 'MON', label: '월' },
                  { id: 'TUE', label: '화' },
                  { id: 'WED', label: '수' },
                  { id: 'THU', label: '목' },
                  { id: 'FRI', label: '금' },
                  { id: 'SAT', label: '토' },
                  { id: 'SUN', label: '일' },
                  { id: 'WEEKDAY', label: '평일반' },
                  { id: 'WEEKEND', label: '주말반' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDayFilter(d.id)}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer text-[11px] font-semibold ${
                      dayFilter === d.id
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Classes Grid */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs text-slate-500">수업 반 목록을 불러오는 중입니다...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                등록된 수업 반이 없습니다.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
                새로운 수업 반을 개설하고 원생들을 배정해보세요.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>첫 번째 반 개설하기</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClasses.map((c) => {
                const capacity = c.capacity || 15;
                const percent = Math.min(Math.round((c.enrolledCount / capacity) * 100), 100);

                return (
                  <div
                    key={c.id}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5">
                          {c.subject && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getSubjectColor(c.subject)}`}
                            >
                              {c.subject}
                            </span>
                          )}
                          {c.targetGrade && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {c.targetGrade}
                            </span>
                          )}
                        </div>

                        {c.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>운영중</span>
                          </span>
                        ) : c.status === 'INACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                            <span>휴강</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold">
                            <span>폐강</span>
                          </span>
                        )}
                      </div>

                      {/* Class Name */}
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                        {c.name}
                      </h3>

                      {/* Class Details */}
                      <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        {c.schedule && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{c.schedule}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            월 <strong className="text-slate-900 dark:text-white">{c.monthlyFee.toLocaleString()}</strong>원
                          </span>
                        </div>
                      </div>

                      {/* Capacity Progress */}
                      <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>수강생 현황</span>
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {c.enrolledCount} / {capacity}명{' '}
                            <span className="text-slate-400 font-normal">({percent}%)</span>
                          </span>
                        </div>

                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percent >= 100
                                ? 'bg-rose-500'
                                : percent >= 80
                                ? 'bg-amber-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEnrollmentModal(c)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800/80 transition-all cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>수강생 관리 ({c.enrolledCount})</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenClassReportModal(c)}
                          title="반 전체 카카오 리포트 일괄 발송"
                          className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 dark:text-slate-400 dark:hover:text-purple-400 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          title="반 정보 수정"
                          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteClass(c)}
                          title="반 삭제"
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ========================================== */}
      {/* 1. Class Create / Edit Modal */}
      {/* ========================================== */}
      {isClassModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsClassModalOpen(false);
              setIsStatusDropdownOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header (Fixed) */}
            <div className="shrink-0 p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editingClass ? '수업 반 정보 수정' : '신규 수업 반 개설'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsClassModalOpen(false);
                  setIsStatusDropdownOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form (Scrollable body + Fixed footer) */}
            <form onSubmit={handleSaveClass} noValidate className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                {classFormError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{classFormError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    반 명칭 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: 중등 수학 심화A반"
                    value={classFormData.name}
                    onChange={(e) => {
                      setClassFormData({ ...classFormData, name: e.target.value });
                      if (nameError) setNameError(null);
                    }}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none transition-all ${
                      nameError
                        ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  {nameError && (
                    <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{nameError}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      과목
                    </label>
                    <input
                      type="text"
                      placeholder="예: 수학, 영어, 국어"
                      value={classFormData.subject}
                      onChange={(e) => setClassFormData({ ...classFormData, subject: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      대상 학년
                    </label>
                    <input
                      type="text"
                      placeholder="예: 초6, 중2, 고1"
                      value={classFormData.targetGrade}
                      onChange={(e) => setClassFormData({ ...classFormData, targetGrade: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    주간 수업 시간표
                  </label>
                  <input
                    type="text"
                    placeholder="예: 월/수/금 17:00-19:00"
                    value={classFormData.schedule}
                    onChange={(e) => setClassFormData({ ...classFormData, schedule: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      수강 정원 (명)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="예: 15 (명)"
                      value={classFormData.capacity}
                      onChange={(e) => setClassFormData({ ...classFormData, capacity: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      월 수강료 (원)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      placeholder="예: 350,000 (원)"
                      value={classFormData.monthlyFee}
                      onChange={(e) => setClassFormData({ ...classFormData, monthlyFee: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Refined Custom Status Selector (Expandable in flow) */}
                <div ref={statusDropdownRef}>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    운영 상태
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <div className="flex items-center gap-2">
                      {classFormData.status === 'ACTIVE' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs"></span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            운영중 (정상 개설)
                          </span>
                        </>
                      )}
                      {classFormData.status === 'INACTIVE' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs"></span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            임시휴강
                          </span>
                        </>
                      )}
                      {classFormData.status === 'CLOSED' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs"></span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            폐강
                          </span>
                        </>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 mr-1.5 transition-transform duration-200 ${
                        isStatusDropdownOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                      }`}
                    />
                  </button>

                  {/* Expandable Status Options */}
                  {isStatusDropdownOpen && (
                    <div className="mt-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      {/* Option 1: ACTIVE */}
                      <button
                        type="button"
                        onClick={() => {
                          setClassFormData({ ...classFormData, status: 'ACTIVE' });
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          classFormData.status === 'ACTIVE'
                            ? 'bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/80 text-emerald-950 dark:text-emerald-200 shadow-xs'
                            : 'hover:bg-white/60 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">운영중 (정상 개설)</span>
                            {classFormData.status === 'ACTIVE' && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">선택됨</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            원생 배정 및 출결 체크가 정상적으로 가능한 상태입니다.
                          </p>
                        </div>
                      </button>

                      {/* Option 2: INACTIVE */}
                      <button
                        type="button"
                        onClick={() => {
                          setClassFormData({ ...classFormData, status: 'INACTIVE' });
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          classFormData.status === 'INACTIVE'
                            ? 'bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-200 shadow-xs'
                            : 'hover:bg-white/60 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <PauseCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">임시휴강</span>
                            {classFormData.status === 'INACTIVE' && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">선택됨</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            방학, 시험 기간 등 일정 기간 수업을 임시 중단합니다.
                          </p>
                        </div>
                      </button>

                      {/* Option 3: CLOSED */}
                      <button
                        type="button"
                        onClick={() => {
                          setClassFormData({ ...classFormData, status: 'CLOSED' });
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          classFormData.status === 'CLOSED'
                            ? 'bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700/80 text-rose-950 dark:text-rose-200 shadow-xs'
                            : 'hover:bg-white/60 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">폐강</span>
                            {classFormData.status === 'CLOSED' && (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">선택됨</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            수업이 종료되어 신규 원생 배정이 차단됩니다.
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Pinned Fixed Footer */}
              <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/80 dark:bg-slate-900/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsClassModalOpen(false);
                    setIsStatusDropdownOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClass}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm shadow-indigo-600/20 text-xs"
                >
                  {isSubmittingClass && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingClass ? '수정 완료' : '반 개설하기'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 2. Enrollment Management Modal */}
      {/* ========================================== */}
      {isEnrollmentModalOpen && selectedClassForEnrollment && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEnrollmentModalOpen(false);
              setIsStudentDropdownOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    [{selectedClassForEnrollment.name}] 수강생 배정 관리
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  현재 수강생: <strong className="text-indigo-600 dark:text-indigo-400">{enrollments.filter(e => e.status === 'ENROLLED').length}</strong> / {selectedClassForEnrollment.capacity || 15}명
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEnrollmentModalOpen(false);
                  setIsStudentDropdownOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Quick Enroll Form (Searchable Autocomplete) */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60">
                <h4 className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 mb-2.5">
                  <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>새로운 원생 수강 등록 (검색 배정)</span>
                </h4>

                {enrollError && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{enrollError}</span>
                  </div>
                )}

                <form onSubmit={handleEnrollStudent} noValidate className="flex flex-col sm:flex-row gap-2.5">
                  {/* Searchable Student Autocomplete Combobox */}
                  <div
                    ref={studentSearchRef}
                    className={`relative flex-1 ${isStudentDropdownOpen ? 'z-50' : 'z-20'}`}
                  >
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="원생 이름, 학년, 학교, 연락처 검색..."
                        value={studentSearchTerm}
                        onChange={(e) => {
                          setStudentSearchTerm(e.target.value);
                          setIsStudentDropdownOpen(true);
                          if (enrollError) setEnrollError(null);
                          if (selectedStudentIdToEnroll) {
                            setSelectedStudentIdToEnroll('');
                          }
                        }}
                        onFocus={() => setIsStudentDropdownOpen(true)}
                        className={`w-full pl-9 pr-8 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:outline-none transition-all ${
                          enrollError && !selectedStudentIdToEnroll
                            ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                            : selectedStudentIdToEnroll
                            ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500'
                        }`}
                      />
                      {studentSearchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setStudentSearchTerm('');
                            setSelectedStudentIdToEnroll('');
                            setIsStudentDropdownOpen(true);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Dropdown List */}
                    {isStudentDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 z-[60] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 max-h-56 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-100">
                        {allStudents
                          .filter((s) => s.status === 'ACTIVE')
                          .filter((s) => {
                            if (!studentSearchTerm.trim()) return true;
                            const term = studentSearchTerm.toLowerCase();
                            return (
                              s.name.toLowerCase().includes(term) ||
                              (s.parentPhone && s.parentPhone.includes(term)) ||
                              (s.studentPhone && s.studentPhone.includes(term)) ||
                              (s.schoolName && s.schoolName.toLowerCase().includes(term)) ||
                              (s.grade && s.grade.toLowerCase().includes(term))
                            );
                          }).length === 0 ? (
                          <div className="py-4 text-center text-slate-400 text-xs">
                            일치하는 원생이 없습니다.
                          </div>
                        ) : (
                          allStudents
                            .filter((s) => s.status === 'ACTIVE')
                            .filter((s) => {
                              if (!studentSearchTerm.trim()) return true;
                              const term = studentSearchTerm.toLowerCase();
                              return (
                                s.name.toLowerCase().includes(term) ||
                                (s.parentPhone && s.parentPhone.includes(term)) ||
                                (s.studentPhone && s.studentPhone.includes(term)) ||
                                (s.schoolName && s.schoolName.toLowerCase().includes(term)) ||
                                (s.grade && s.grade.toLowerCase().includes(term))
                              );
                            })
                            .map((s) => {
                              const isAlreadyEnrolled = enrollments.some(
                                (e) => e.studentId === s.id && e.status === 'ENROLLED',
                              );
                              const isSelected = selectedStudentIdToEnroll === String(s.id);

                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  disabled={isAlreadyEnrolled}
                                  onClick={() => {
                                    setSelectedStudentIdToEnroll(String(s.id));
                                    setStudentSearchTerm(`${s.name} (${s.grade || '학년미기재'}, ${s.schoolName || '학교미기재'})`);
                                    setIsStudentDropdownOpen(false);
                                    setEnrollError(null);
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                                    isAlreadyEnrolled
                                      ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40 text-slate-400'
                                      : isSelected
                                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-bold border border-indigo-200 dark:border-indigo-800/80'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                      {s.name.slice(0, 1)}
                                    </div>
                                    <div className="min-w-0 truncate">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                                          {s.name}
                                        </span>
                                        {(s.grade || s.schoolName) && (
                                          <span className="text-[10px] text-slate-400 truncate">
                                            ({s.grade || ''}{s.grade && s.schoolName ? ' • ' : ''}{s.schoolName || ''})
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-400">
                                        {s.parentPhone || s.studentPhone || '연락처 없음'}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    {isAlreadyEnrolled ? (
                                      <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-normal">
                                        수강중
                                      </span>
                                    ) : isSelected ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Custom Floating Date Picker with Direct Keyboard Editing */}
                  <CustomDatePicker
                    value={enrollStartDate}
                    onChange={(val) => setEnrollStartDate(val)}
                    showTodayShortcut={true}
                  />

                  <button
                    type="submit"
                    disabled={isEnrollingStudent || !selectedStudentIdToEnroll}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                  >
                    {isEnrollingStudent ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>배정 등록</span>
                  </button>
                </form>
              </div>

              {/* Enrolled Students Table */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2.5">
                  수강 중인 학생 목록 ({enrollments.length}명)
                </h4>

                {isLoadingEnrollments ? (
                  <div className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <span>수강생 목록 로딩 중...</span>
                  </div>
                ) : enrollments.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    현재 이 반에 배정된 학생이 없습니다. 위에서 학생을 배정해주세요.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                          <th className="py-2.5 px-3 rounded-tl-2xl">학생명</th>
                          <th className="py-2.5 px-3">학년/학교</th>
                          <th className="py-2.5 px-3">학부모 연락처</th>
                          <th className="py-2.5 px-3">수강 시작일</th>
                          <th className="py-2.5 px-3">수강 상태</th>
                          <th className="py-2.5 px-3 text-right rounded-tr-2xl">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {enrollments.map((item) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${
                              activeEnrollmentStatusRowId === item.id ? 'relative z-50' : 'relative z-10'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {item.student.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                              {item.student.grade || '-'} / {item.student.schoolName || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {item.student.parentPhone}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                              {new Date(item.startDate).toLocaleDateString('ko-KR')}
                            </td>
                            <td
                              className={`py-2.5 px-3 ${
                                activeEnrollmentStatusRowId === item.id ? 'relative z-50' : 'relative z-10'
                              }`}
                            >
                              <div
                                className={`relative inline-block ${
                                  activeEnrollmentStatusRowId === item.id ? 'z-50' : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    if (activeEnrollmentStatusRowId === item.id) {
                                      setActiveEnrollmentStatusRowId(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const spaceBelow = window.innerHeight - rect.bottom;
                                      // Default downward; only flip upward if space below is genuinely tight (< 170px) and more space above
                                      setEnrollmentStatusDropdownDirection(
                                        spaceBelow < 170 && rect.top > spaceBelow ? 'up' : 'down'
                                      );
                                      setActiveEnrollmentStatusRowId(item.id);
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                    item.status === 'ENROLLED'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                      : item.status === 'COMPLETED'
                                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                                      : item.status === 'PAUSED'
                                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      item.status === 'ENROLLED'
                                        ? 'bg-emerald-500'
                                        : item.status === 'COMPLETED'
                                        ? 'bg-blue-500'
                                        : item.status === 'PAUSED'
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                  />
                                  <span>
                                    {item.status === 'ENROLLED'
                                      ? '수강중'
                                      : item.status === 'COMPLETED'
                                      ? '종강'
                                      : item.status === 'PAUSED'
                                      ? '일시정지'
                                      : '중도하차'}
                                  </span>
                                  <ChevronDown className="w-3 h-3 opacity-60" />
                                </button>

                                {activeEnrollmentStatusRowId === item.id && (
                                  <div
                                    ref={enrollmentRowStatusRef}
                                    className={`absolute ${
                                      enrollmentStatusDropdownDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                    } left-0 z-[60] w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100`}
                                  >
                                      {[
                                        {
                                          id: 'ENROLLED',
                                          label: '수강중',
                                          dot: 'bg-emerald-500',
                                          activeClass:
                                            'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
                                        },
                                        {
                                          id: 'COMPLETED',
                                          label: '종강 (수료)',
                                          dot: 'bg-blue-500',
                                          activeClass:
                                            'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
                                        },
                                        {
                                          id: 'PAUSED',
                                          label: '일시정지',
                                          dot: 'bg-amber-500',
                                          activeClass:
                                            'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
                                        },
                                        {
                                          id: 'DROPPED',
                                          label: '중도하차 (퇴반)',
                                          dot: 'bg-rose-500',
                                          activeClass:
                                            'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
                                        },
                                      ].map((opt) => (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => {
                                            handleUpdateEnrollmentStatus(
                                              item.id,
                                              opt.id as EnrollmentStatus
                                            );
                                            setActiveEnrollmentStatusRowId(null);
                                          }}
                                          className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                            item.status === opt.id
                                              ? `${opt.activeClass} font-bold`
                                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                                          <span>{opt.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEnrollment(item.id, item.student.name)}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEnrollmentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 3. Class Reports Bulk Send Modal          */}
      {/* ========================================== */}
      {isClassReportModalOpen && selectedClassForReport && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSendingClassReport) {
              setIsClassReportModalOpen(false);
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
                    <span>반 전체 학습 리포트 일괄 발송</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold">
                      {selectedClassForReport.name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    반에 재원 중인 원생 전원에게 개인별 출결/과제 리포트를 생성하여 카카오로 발송합니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsClassReportModalOpen(false)}
                disabled={isSendingClassReport}
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
                  <span>리포트 대상 기간 설정</span>
                  <span className="text-[11px] text-slate-400 font-normal">프리셋 버튼으로 빠른 설정</span>
                </label>

                {/* Presets */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyClassPreset('THIS_MONTH')}
                    className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center"
                  >
                    이번 달
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyClassPreset('LAST_MONTH')}
                    className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center"
                  >
                    지난 달
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyClassPreset('LAST_7_DAYS')}
                    className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-center"
                  >
                    최근 7일
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="date"
                    value={classReportStart}
                    onChange={(e) => setClassReportStart(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-slate-400 font-bold">~</span>
                  <input
                    type="date"
                    value={classReportEnd}
                    onChange={(e) => setClassReportEnd(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* 2. Additional Custom Note Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>선생님 추가 전달사항 / 당부의 말씀 (공통 첨부)</span>
                </label>
                <textarea
                  rows={3}
                  value={classReportCustomNote}
                  onChange={(e) => setClassReportCustomNote(e.target.value)}
                  placeholder="예: 다음 주부터 중간고사 대비 모의고사가 진행됩니다. 학생들의 적극적인 참여 부탁드립니다."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                />
              </div>

              {/* 3. Sample Kakao Bubble Preview */}
              {isLoadingClassReportPreview ? (
                <div className="py-6 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-purple-600" />
                  <span>대표 학생 알림톡 미리보기 로드 중...</span>
                </div>
              ) : classReportSamplePreview ? (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>실제 전송될 알림톡 메시지 샘플 ({classReportSamplePreview.studentName} 학생 기준)</span>
                  </span>
                  <div className="p-3.5 rounded-2xl bg-[#FAE100]/25 dark:bg-[#FAE100]/10 border border-[#FAE100] dark:border-amber-700/60 max-h-48 overflow-y-auto font-sans text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed shadow-xs">
                    {classReportSamplePreview.message}
                    {classReportCustomNote && `\n\n📌 선생님 전달사항:\n${classReportCustomNote}`}
                  </div>
                </div>
              ) : null}

              {/* Error Alert */}
              {classReportError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">발송 실패</p>
                    <p className="text-[11px] mt-0.5">{classReportError}</p>
                  </div>
                </div>
              )}

              {/* Success Result Report */}
              {classReportResult && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Summary Metric Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center justify-between mb-2">
                      <span>발송 처리 결과 요약</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        총 {classReportResult.totalStudents}명 대상
                      </span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">발송 성공</span>
                        <div className="text-lg font-extrabold text-emerald-800 dark:text-emerald-200">
                          {classReportResult.sentCount}건
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-500 font-semibold">제외 / 실패</span>
                        <div className="text-lg font-extrabold text-slate-700 dark:text-slate-300">
                          {classReportResult.failedCount}건
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Failure / Skipped List if any */}
                  {classReportResult.failed && classReportResult.failed.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                        발송 제외 또는 실패 내역
                      </span>
                      <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                        {classReportResult.failed.map((f, idx) => (
                          <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{f.studentName}</span>
                            <span className="text-rose-600 dark:text-rose-400">{f.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsClassReportModalOpen(false)}
                disabled={isSendingClassReport}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer text-xs"
              >
                닫기
              </button>

              <button
                type="button"
                onClick={handleSendClassReport}
                disabled={isSendingClassReport || !classReportStart || !classReportEnd}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSendingClassReport ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>전체 발송 처리 중...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>반 재원생 전원 발송하기</span>
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
