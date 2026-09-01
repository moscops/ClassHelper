'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Send,
  Calendar,
  Users,
  BookOpen,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
  Smartphone,
  Info,
  Clock,
  Plus,
  UserCheck,
  Award,
  Edit3,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  reportsService,
  StudentReport,
  SendReportResult,
  ClassReportSendResult,
} from '@/lib/reports-service';
import { classesService, ClassItem } from '@/lib/classes-service';
import { studentsService, StudentItem } from '@/lib/students-service';
import { CustomDatePicker } from '@/components/CustomDatePicker';
import { AppLayout } from '@/components/common/AppLayout';

export default function ReportsPage() {
  const router = useRouter();
  const { user, academy, isAuthenticated, isHydrated } = useAuthStore();

  // Active Tab: 'CLASSES' (반별 일괄 발송) | 'STUDENTS' (원생별 개별 발송) | 'GUIDE' (가이드)
  const [activeTab, setActiveTab] = useState<'CLASSES' | 'STUDENTS' | 'GUIDE'>('CLASSES');

  // Common Data State
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Global Period Selection for Batch Operations
  const [periodPreset, setPeriodPreset] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'LAST_7_DAYS' | 'CUSTOM'>('THIS_MONTH');
  const [globalStart, setGlobalStart] = useState<string>('');
  const [globalEnd, setGlobalEnd] = useState<string>('');

  // Top Wizard Modal: [+ 리포트 발송] Action
  const [isWizardModalOpen, setIsWizardModalOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<'CLASS' | 'STUDENT'>('CLASS');
  const [wizardSelectedClassId, setWizardSelectedClassId] = useState<number | ''>('');
  const [wizardSelectedStudentId, setWizardSelectedStudentId] = useState<number | ''>('');
  const [wizardPreview, setWizardPreview] = useState<StudentReport | null>(null);
  const [wizardEditableMessage, setWizardEditableMessage] = useState<string>('');
  const [isLoadingWizardPreview, setIsLoadingWizardPreview] = useState(false);
  const [isSendingWizard, setIsSendingWizard] = useState(false);
  const [wizardResult, setWizardResult] = useState<ClassReportSendResult | SendReportResult | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);

  // Class Batch Send State & Modal
  const [selectedClassForBatch, setSelectedClassForBatch] = useState<ClassItem | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchSamplePreview, setBatchSamplePreview] = useState<StudentReport | null>(null);
  const [batchCustomNote, setBatchCustomNote] = useState<string>('');
  const [isLoadingBatchPreview, setIsLoadingBatchPreview] = useState(false);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<ClassReportSendResult | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Student Single Report State & Modal
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<StudentItem | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentPeriodStart, setStudentPeriodStart] = useState<string>('');
  const [studentPeriodEnd, setStudentPeriodEnd] = useState<string>('');
  const [reportPreview, setReportPreview] = useState<StudentReport | null>(null);
  const [editableMessage, setEditableMessage] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSendingStudentReport, setIsSendingStudentReport] = useState(false);
  const [studentSendResult, setStudentSendResult] = useState<SendReportResult | null>(null);
  const [studentReportError, setStudentReportError] = useState<string | null>(null);

  // Student Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');

  // Today's formatted date string
  const [todayDateStr, setTodayDateStr] = useState('');

  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    setTodayDateStr(today.toLocaleDateString('ko-KR', options));
  }, []);

  // Authentication check
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Initial Date Setup: Default to Current Month
  useEffect(() => {
    applyPreset('THIS_MONTH');
  }, []);

  const applyPreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_7_DAYS') => {
    setPeriodPreset(preset);
    const now = new Date();
    let start = '';
    let end = '';

    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`;
      end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      start = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`;
      end = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    } else if (preset === 'LAST_7_DAYS') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      start = `${past7.getFullYear()}-${String(past7.getMonth() + 1).padStart(2, '0')}-${String(past7.getDate()).padStart(2, '0')}`;
      end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    setGlobalStart(start);
    setGlobalEnd(end);
  };

  // ESC to close all modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsWizardModalOpen(false);
        setIsBatchModalOpen(false);
        setIsStudentModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [classesRes, studentsRes] = await Promise.all([
        classesService.getClasses({ limit: 100 }),
        studentsService.getStudents({ limit: 200 }),
      ]);
      setClasses(classesRes.items || []);
      setStudents(studentsRes.items || []);
    } catch (err) {
      console.error('Failed to load classes or students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadData();
    }
  }, [isHydrated, isAuthenticated]);

  // Handle Top [+ 리포트 발송] Wizard
  const handleOpenWizard = () => {
    setWizardMode('CLASS');
    const firstClassId = classes.length > 0 ? classes[0].id : '';
    const firstStudentId = students.length > 0 ? students[0].id : '';
    setWizardSelectedClassId(firstClassId);
    setWizardSelectedStudentId(firstStudentId);
    setWizardResult(null);
    setWizardError(null);
    setWizardPreview(null);
    setWizardEditableMessage('');
    setIsWizardModalOpen(true);

    if (firstClassId) {
      handleFetchWizardClassSample(Number(firstClassId));
    }
  };

  const handleFetchWizardClassSample = async (classId: number) => {
    if (!classId || !globalStart || !globalEnd) return;
    setIsLoadingWizardPreview(true);
    setWizardError(null);
    try {
      const enrollments = await classesService.getEnrolledStudents(classId);
      if (enrollments && enrollments.length > 0) {
        const sampleStudentId = enrollments[0].student.id;
        const preview = await reportsService.previewStudentReport(sampleStudentId, globalStart, globalEnd);
        setWizardPreview(preview);
        setWizardEditableMessage(preview.message);
      } else {
        setWizardPreview(null);
        setWizardEditableMessage('');
      }
    } catch (err: any) {
      console.error('Failed to fetch wizard class sample:', err);
    } finally {
      setIsLoadingWizardPreview(false);
    }
  };

  const handleFetchWizardStudentPreview = async (studentId: number) => {
    if (!studentId || !globalStart || !globalEnd) return;
    setIsLoadingWizardPreview(true);
    setWizardError(null);
    try {
      const preview = await reportsService.previewStudentReport(studentId, globalStart, globalEnd);
      setWizardPreview(preview);
      setWizardEditableMessage(preview.message);
    } catch (err: any) {
      console.error('Failed to fetch wizard preview:', err);
      setWizardError(err.response?.data?.message || '리포트 미리보기를 생성하지 못했습니다.');
    } finally {
      setIsLoadingWizardPreview(false);
    }
  };

  const handleExecuteWizardSend = async () => {
    if (!globalStart || !globalEnd) {
      setWizardError('발송 대상 기간을 설정해주세요.');
      return;
    }

    setIsSendingWizard(true);
    setWizardError(null);
    setWizardResult(null);

    try {
      if (wizardMode === 'CLASS') {
        if (!wizardSelectedClassId) {
          setWizardError('발송 대상 반을 선택해주세요.');
          setIsSendingWizard(false);
          return;
        }
        const result = await reportsService.sendClassReports(
          Number(wizardSelectedClassId),
          globalStart,
          globalEnd,
          wizardEditableMessage,
        );
        setWizardResult(result);
      } else {
        if (!wizardSelectedStudentId) {
          setWizardError('발송 대상 학생을 선택해주세요.');
          setIsSendingWizard(false);
          return;
        }
        const result = await reportsService.sendStudentReport(
          Number(wizardSelectedStudentId),
          globalStart,
          globalEnd,
          wizardEditableMessage,
        );
        setWizardResult(result);
      }
    } catch (err: any) {
      console.error('Wizard send failed:', err);
      setWizardError(err.response?.data?.message || '리포트 발송 중 오류가 발생했습니다.');
    } finally {
      setIsSendingWizard(false);
    }
  };

  // Handle Class Batch Send Modal
  const handleOpenBatchModal = async (cls: ClassItem) => {
    setSelectedClassForBatch(cls);
    setIsBatchModalOpen(true);
    setBatchResult(null);
    setBatchError(null);
    setBatchSamplePreview(null);
    setBatchCustomNote('');

    // Load sample student report preview for this class
    if (globalStart && globalEnd) {
      setIsLoadingBatchPreview(true);
      try {
        const enrollments = await classesService.getEnrolledStudents(cls.id);
        if (enrollments && enrollments.length > 0) {
          const firstId = enrollments[0].student.id;
          const preview = await reportsService.previewStudentReport(firstId, globalStart, globalEnd);
          setBatchSamplePreview(preview);
        }
      } catch (err) {
        console.error('Failed to load batch preview sample:', err);
      } finally {
        setIsLoadingBatchPreview(false);
      }
    }
  };

  const handleExecuteBatchSend = async () => {
    if (!selectedClassForBatch || !globalStart || !globalEnd) return;

    setIsSendingBatch(true);
    setBatchError(null);
    setBatchResult(null);

    try {
      const result = await reportsService.sendClassReports(
        selectedClassForBatch.id,
        globalStart,
        globalEnd,
        batchCustomNote,
      );
      setBatchResult(result);
    } catch (err: any) {
      console.error('Failed to send class reports:', err);
      setBatchError(
        err.response?.data?.message || '반 전체 리포트 발송 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSendingBatch(false);
    }
  };

  // Handle Student Single Report Modal
  const handleOpenStudentModal = (student: StudentItem) => {
    setSelectedStudentForReport(student);
    setIsStudentModalOpen(true);
    setStudentSendResult(null);
    setStudentReportError(null);
    setReportPreview(null);
    setEditableMessage('');

    const start = globalStart || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const end = globalEnd || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    setStudentPeriodStart(start);
    setStudentPeriodEnd(end);
    fetchStudentPreview(student.id, start, end);
  };

  const fetchStudentPreview = async (studentId: number, start: string, end: string) => {
    setIsLoadingPreview(true);
    setStudentReportError(null);
    try {
      const preview = await reportsService.previewStudentReport(studentId, start, end);
      setReportPreview(preview);
      setEditableMessage(preview.message);
    } catch (err: any) {
      console.error('Failed to fetch preview:', err);
      setStudentReportError(
        err.response?.data?.message || '리포트 미리보기를 생성하지 못했습니다.',
      );
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSendStudentReport = async () => {
    if (!selectedStudentForReport || !studentPeriodStart || !studentPeriodEnd) return;

    setIsSendingStudentReport(true);
    setStudentReportError(null);
    setStudentSendResult(null);

    try {
      const result = await reportsService.sendStudentReport(
        selectedStudentForReport.id,
        studentPeriodStart,
        studentPeriodEnd,
        editableMessage,
      );
      setStudentSendResult(result);
    } catch (err: any) {
      console.error('Failed to send student report:', err);
      setStudentReportError(
        err.response?.data?.message || '리포트 카카오 발송 중 오류가 발생했습니다.',
      );
    } finally {
      setIsSendingStudentReport(false);
    }
  };

  // Filtered Students List
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !searchTerm.trim() ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.parentPhone && s.parentPhone.includes(searchTerm)) ||
      (s.schoolName && s.schoolName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.grade && s.grade.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesClass =
      classFilter === 'ALL'
        ? true
        : Boolean(s.enrolledClasses?.some((c) => String(c.id) === classFilter));

    return matchesSearch && matchesClass;
  });

  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-2.5">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400">리포트 관리 센터를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout currentPath="/reports">
      <main className="flex-1 relative overflow-hidden py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 relative z-10">
          {/* 1. Dashboard Standard Greeting & Header Card */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xs transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800 text-xs font-semibold text-purple-700 dark:text-purple-300">
                    <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>학습 & 출결 안심 리포트 센터</span>
                  </div>
                  {todayDateStr && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{todayDateStr}</span>
                    </div>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  정기 학습 & 출결 리포트 발송 관리 ✨
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{academy?.name}</span> 재원생들의 기간별 출결률과 과제 수행 성취도를 종합 집계하여 학부모님께 카카오 알림톡으로 안심 리포트를 전송합니다.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  title="데이터 새로고침"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenWizard}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer hover:scale-102"
                >
                  <Plus className="w-4 h-4" />
                  <span>리포트 발송</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Standard 4-Grid Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2.5">
                <Users className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">관리 대상 재원생</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {students.filter((s) => s.status === 'ACTIVE').length}명
                </span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  총 {students.length}명
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700/60 hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-2.5">
                <BookOpen className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">개설 수업 반</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {classes.filter((c) => c.status === 'ACTIVE').length}개 반
                </span>
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  총 {classes.length}개 반
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2.5">
                <CheckCircle2 className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">카카오 알림톡 엔진</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  정상 가동 중
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  발송 전 편집 지원
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700/60 hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2.5">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">권장 정기 발송 주기</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  주간 / 월간 정기
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  매월 말일 / 주말
                </span>
              </div>
            </div>
          </div>

          {/* 3. Dashboard Standard Filter Toolbar & Period Selector */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            {/* Upper Row: Category Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('CLASSES')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'CLASSES'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>반별 일괄 발송 ({classes.length}개 반)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('STUDENTS')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'STUDENTS'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>원생별 개별 발송 & 미리보기 ({students.length}명)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('GUIDE')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'GUIDE'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>카카오 알림톡 발송 규격 가이드</span>
                </button>
              </div>

              {/* Presets */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => applyPreset('THIS_MONTH')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    periodPreset === 'THIS_MONTH'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  이번 달
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('LAST_MONTH')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    periodPreset === 'LAST_MONTH'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  지난 달
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('LAST_7_DAYS')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    periodPreset === 'LAST_7_DAYS'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  최근 7일
                </button>
              </div>
            </div>

            {/* Lower Row: Date Range & Student Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5">
              {/* Date Pickers */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>집계 기간:</span>
                </div>
                <div className="flex items-center gap-2">
                  <CustomDatePicker
                    value={globalStart}
                    onChange={(val) => {
                      setGlobalStart(val);
                      setPeriodPreset('CUSTOM');
                    }}
                    showTodayShortcut={false}
                  />
                  <span className="text-slate-400 font-bold text-xs">~</span>
                  <CustomDatePicker
                    value={globalEnd}
                    onChange={(val) => {
                      setGlobalEnd(val);
                      setPeriodPreset('CUSTOM');
                    }}
                    showTodayShortcut={false}
                  />
                </div>
              </div>

              {/* Search Bar for Students Tab */}
              {activeTab === 'STUDENTS' && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="원생 이름, 학부모 연락처..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8.5 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold focus:outline-none shrink-0"
                  >
                    <option value="ALL">전체 반</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={String(cls.id)}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: 반별 일괄 발송 뷰 (Classes Batch Send)             */}
          {/* ========================================================= */}
          {activeTab === 'CLASSES' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">수업 반 목록을 불러오고 있습니다...</p>
                </div>
              ) : classes.length === 0 ? (
                <div className="py-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">개설된 수업 반이 없습니다</h3>
                  <Link
                    href="/classes"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>반 개설하러 가기</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all interactive-card"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] border border-indigo-200 dark:border-indigo-800">
                            {cls.subject || '과목 미지정'}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                            재원생 {cls.enrolledCount}명
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {cls.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          대상: {cls.targetGrade || '전체 학년'} • {cls.schedule || '시간표 미지정'}
                        </p>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {globalStart} ~ {globalEnd}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenBatchModal(cls)}
                          disabled={cls.enrolledCount === 0}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>미리보기 및 발송</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: 원생별 개별 발송 뷰 (Students Single Report)       */}
          {/* ========================================================= */}
          {activeTab === 'STUDENTS' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">원생 목록을 불러오고 있습니다...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                  <p>일치하는 원생 검색 결과가 없습니다.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                        <th className="py-3 px-4">학생명</th>
                        <th className="py-3 px-4">학년 / 학교</th>
                        <th className="py-3 px-4">학부모 연락처</th>
                        <th className="py-3 px-4">수강 중인 반</th>
                        <th className="py-3 px-4 text-right">리포트 발송</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {s.grade || '-'} ({s.schoolName || '-'})
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            {s.parentPhone || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {s.enrolledClasses && s.enrolledClasses.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {s.enrolledClasses.map((c) => (
                                  <span
                                    key={c.id}
                                    className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-medium"
                                  >
                                    {c.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">수강 반 없음</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenStudentModal(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800/80 transition-colors cursor-pointer text-xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>미리보기 & 발송</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: 템플릿 & 발송 가이드 뷰 (Guide & Template)         */}
          {/* ========================================================= */}
          {activeTab === 'GUIDE' && (
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    카카오 알림톡 정기 리포트 메시지 규격
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    원생의 실시간 출결 및 과제 데이터를 종합하여 학부모 안심 리포트를 생성하며, 발송 전 자유롭게 편집할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    <UserCheck className="w-4 h-4" />
                    <span>1. 출결 집계 항목</span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                    <li>총 수업일수 및 출석일수 (출석률 % 자동 계산)</li>
                    <li>지각, 결석, 조퇴 건수 상세 표기</li>
                    <li>미등원 경고 및 보강 필요 내역 반영</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                    <Award className="w-4 h-4" />
                    <span>2. 과제 수행 집계 항목</span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                    <li>총 부여 과제 수 대비 완료 건수 (과제 완수율 %)</li>
                    <li>과제 평균 점수 및 핵심 성취도</li>
                    <li>담당 강사의 수업 일지 피드백 반영</li>
                  </ul>
                </div>
              </div>

              {/* Sample Message Preview Card */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  실제 카카오 알림톡 전송 메시지 예시
                </span>
                <div className="p-5 rounded-2xl bg-[#FAE100]/20 dark:bg-[#FAE100]/10 border border-[#FAE100] dark:border-amber-700/60 max-w-lg shadow-xs text-slate-900 dark:text-slate-100 text-xs font-sans whitespace-pre-wrap leading-relaxed">
{`[ClassHelper] 김민준 학생의 학습/출결 리포트

안녕하세요, 학부모님.
김민준 학생의 2026-09-01 ~ 2026-09-30 기간 학습 리포트를 안내해 드립니다.

📅 출결 현황
- 총 수업일: 20일
- 출석: 18일 (출석률: 90%)
- 지각: 1회 / 결석: 1회 / 조퇴: 0회

📝 과제 수행 현황
- 총 과제: 10건 중 8건 완료 (완수율: 80%)
- 과제 평균 점수: 92.5점

앞으로도 학생의 꾸준한 성장과 학업 성취를 위해 최선을 다해 지도하겠습니다. 감사합니다.`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* MODAL 1: 상단 우측 [+ 리포트 발송] 대화형 마법사 모달       */}
        {/* ========================================================= */}
        {isWizardModalOpen && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSendingWizard) {
                setIsWizardModalOpen(false);
              }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
          >
            <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
                    <Send className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      학습 & 출결 리포트 생성 및 발송
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      발송 대상과 기간을 설정하고, 메시지 내용을 직접 확인 및 수정한 뒤 전송하세요.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWizardModalOpen(false)}
                  disabled={isSendingWizard}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
                {/* 1. Send Mode Selection */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    발송 유형 선택
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setWizardMode('CLASS');
                        setWizardResult(null);
                        setWizardError(null);
                        if (wizardSelectedClassId) {
                          handleFetchWizardClassSample(Number(wizardSelectedClassId));
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        wizardMode === 'CLASS'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 shadow-2xs font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>반 전체 일괄 발송</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                        선택한 반의 재원생 전원에게 동시 전송
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWizardMode('STUDENT');
                        setWizardResult(null);
                        setWizardError(null);
                        if (wizardSelectedStudentId) {
                          handleFetchWizardStudentPreview(Number(wizardSelectedStudentId));
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        wizardMode === 'STUDENT'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 shadow-2xs font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>원생 1인 개별 발송</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                        원생 선택 후 실시간 미리보기 및 발송
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Target Selection */}
                {wizardMode === 'CLASS' ? (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      대상 수업 반
                    </label>
                    <select
                      value={wizardSelectedClassId}
                      onChange={(e) => {
                        const cid = Number(e.target.value);
                        setWizardSelectedClassId(cid);
                        handleFetchWizardClassSample(cid);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.subject || '과목미지정'} • 재원생 {cls.enrolledCount}명)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      대상 원생
                    </label>
                    <select
                      value={wizardSelectedStudentId}
                      onChange={(e) => {
                        const sid = Number(e.target.value);
                        setWizardSelectedStudentId(sid);
                        handleFetchWizardStudentPreview(sid);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.grade || '학년미지정'} • {s.parentPhone || '연락처없음'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Period Picker with CustomDatePicker */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    집계 기간 설정
                  </label>
                  <div className="flex items-center gap-2">
                    <CustomDatePicker
                      value={globalStart}
                      onChange={(val) => {
                        setGlobalStart(val);
                        if (wizardMode === 'STUDENT' && wizardSelectedStudentId) {
                          reportsService.previewStudentReport(Number(wizardSelectedStudentId), val, globalEnd).then((p) => {
                            setWizardPreview(p);
                            setWizardEditableMessage(p.message);
                          }).catch(() => {});
                        }
                      }}
                      showTodayShortcut={false}
                    />
                    <span className="text-slate-400 font-bold">~</span>
                    <CustomDatePicker
                      value={globalEnd}
                      onChange={(val) => {
                        setGlobalEnd(val);
                        if (wizardMode === 'STUDENT' && wizardSelectedStudentId) {
                          reportsService.previewStudentReport(Number(wizardSelectedStudentId), globalStart, val).then((p) => {
                            setWizardPreview(p);
                            setWizardEditableMessage(p.message);
                          }).catch(() => {});
                        }
                      }}
                      showTodayShortcut={false}
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {wizardError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{wizardError}</span>
                  </div>
                )}

                {/* 4. Live Message Edit & Kakao Bubble Preview */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>카카오 알림톡 발송 내용 직접 수정</span>
                    </label>
                    {wizardPreview && (
                      <button
                        type="button"
                        onClick={() => setWizardEditableMessage(wizardPreview.message)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer"
                        title="자동 계산된 기본 메시지로 되돌립니다"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>기본 문구로 초기화</span>
                      </button>
                    )}
                  </div>

                  {isLoadingWizardPreview ? (
                    <div className="py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-indigo-600" />
                      <span>리포트 미리보기 계산 중...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Left: Textarea Editor */}
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-400 block font-medium">메시지 본문 편집 (자유 수정 가능)</span>
                        <textarea
                          rows={8}
                          value={wizardEditableMessage}
                          onChange={(e) => setWizardEditableMessage(e.target.value)}
                          placeholder="발송할 알림톡 메시지 내용을 확인하고 수정하세요..."
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                        />
                      </div>

                      {/* Right: Kakao Yellow Bubble Preview */}
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-400 block font-medium">실제 학부모 수신 화면 (카카오 알림톡)</span>
                        <div className="p-3.5 rounded-2xl bg-[#FAE100]/25 dark:bg-[#FAE100]/10 border border-[#FAE100] dark:border-amber-700/60 max-h-52 overflow-y-auto font-sans text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed shadow-xs">
                          {wizardEditableMessage || '메시지 본문이 여기에 표시됩니다.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Result Message */}
                {wizardResult && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>리포트 카카오 알림톡 발송 완료!</span>
                    </div>
                    {'sentCount' in wizardResult ? (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        총 {wizardResult.sentCount}명의 학부모님께 정상 전송되었습니다. (실패 {wizardResult.failedCount}건)
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        수신 번호: {wizardResult.sentTo} (알림 ID #{wizardResult.notificationId})
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsWizardModalOpen(false)}
                  disabled={isSendingWizard}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  닫기
                </button>

                <button
                  type="button"
                  onClick={handleExecuteWizardSend}
                  disabled={isSendingWizard || !globalStart || !globalEnd}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingWizard ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>발송 처리 중...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>카카오 알림톡 최종 발송</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: 반별 일괄 발송 확인 및 결과 모달               */}
        {/* ========================================================= */}
        {isBatchModalOpen && selectedClassForBatch && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSendingBatch) setIsBatchModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
          >
            <div className="w-full max-w-xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto">
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
                    <Send className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      반 전체 리포트 일괄 발송 확인
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedClassForBatch.name} (재원생 {selectedClassForBatch.enrolledCount}명)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  disabled={isSendingBatch}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    발송 대상 기간: <span className="text-indigo-600 dark:text-indigo-400 font-mono">{globalStart} ~ {globalEnd}</span>
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    반에 속한 모든 재원생({selectedClassForBatch.enrolledCount}명)의 맞춤 출결 및 과제 데이터가 각각 계산되어 카카오 알림톡으로 전송됩니다.
                  </p>
                </div>

                {/* Additional Note Input */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>선생님 추가 전달사항 / 당부의 말씀 (공통 첨부)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={batchCustomNote}
                    onChange={(e) => setBatchCustomNote(e.target.value)}
                    placeholder="예: 다음 주부터 중간고사 대비 모의고사가 진행됩니다. 학생들의 적극적인 참여 부탁드립니다."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Sample Kakao Bubble Preview */}
                {isLoadingBatchPreview ? (
                  <div className="py-6 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-indigo-600" />
                    <span>대표 학생 알림톡 미리보기 로드 중...</span>
                  </div>
                ) : batchSamplePreview ? (
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      실제 전송될 알림톡 메시지 샘플 ({batchSamplePreview.studentName} 학생 기준)
                    </span>
                    <div className="p-3.5 rounded-2xl bg-[#FAE100]/25 dark:bg-[#FAE100]/10 border border-[#FAE100] dark:border-amber-700/60 max-h-48 overflow-y-auto font-sans text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed shadow-xs">
                      {batchSamplePreview.message}
                      {batchCustomNote && `\n\n📌 선생님 전달사항:\n${batchCustomNote}`}
                    </div>
                  </div>
                ) : null}

                {batchError && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{batchError}</span>
                  </div>
                )}

                {batchResult && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center">
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">발송 성공</span>
                        <div className="text-xl font-extrabold text-emerald-800 dark:text-emerald-200">
                          {batchResult.sentCount}건
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                        <span className="text-[11px] text-slate-500 font-semibold">제외 / 실패</span>
                        <div className="text-xl font-extrabold text-slate-700 dark:text-slate-300">
                          {batchResult.failedCount}건
                        </div>
                      </div>
                    </div>

                    {batchResult.failed && batchResult.failed.length > 0 && (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl max-h-32 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {batchResult.failed.map((f, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between text-[11px]">
                            <span className="font-bold">{f.studentName}</span>
                            <span className="text-rose-600 font-medium">{f.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  disabled={isSendingBatch}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  닫기
                </button>

                <button
                  type="button"
                  onClick={handleExecuteBatchSend}
                  disabled={isSendingBatch || !globalStart || !globalEnd}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingBatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>발송 처리 중...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>반 재원생 전원 최종 발송</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 3: 원생 1인 리포트 미리보기 & 직접 수정 & 발송 모달 */}
        {/* ========================================================= */}
        {isStudentModalOpen && selectedStudentForReport && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSendingStudentReport) setIsStudentModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
          >
            <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 my-auto">
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{selectedStudentForReport.name} 학생 리포트 발송</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      학부모 연락처: {selectedStudentForReport.parentPhone || '없음'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  disabled={isSendingStudentReport}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
                {/* Period Selection with CustomDatePicker */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    리포트 집계 기간
                  </label>
                  <div className="flex items-center gap-2">
                    <CustomDatePicker
                      value={studentPeriodStart}
                      onChange={(val) => {
                        setStudentPeriodStart(val);
                        fetchStudentPreview(selectedStudentForReport.id, val, studentPeriodEnd);
                      }}
                      showTodayShortcut={false}
                    />
                    <span className="text-slate-400 font-bold">~</span>
                    <CustomDatePicker
                      value={studentPeriodEnd}
                      onChange={(val) => {
                        setStudentPeriodEnd(val);
                        fetchStudentPreview(selectedStudentForReport.id, studentPeriodStart, val);
                      }}
                      showTodayShortcut={false}
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {studentReportError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{studentReportError}</span>
                  </div>
                )}

                {/* Preview & Edit Area */}
                {isLoadingPreview ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>리포트 데이터를 집계하는 중...</span>
                  </div>
                ) : reportPreview ? (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Metrics Summary */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                        <span className="text-[11px] text-slate-400 font-semibold">출결 요약</span>
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          {reportPreview.attendance.attendanceRate}% 출석
                        </div>
                        <p className="text-[11px] text-slate-500">
                          총 {reportPreview.attendance.totalDays}일 중 {reportPreview.attendance.presentCount}일 출석 (지각 {reportPreview.attendance.lateCount}, 결석 {reportPreview.attendance.absentCount})
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                        <span className="text-[11px] text-slate-400 font-semibold">과제 요약</span>
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {reportPreview.homework.completionRate}% 완수
                        </div>
                        <p className="text-[11px] text-slate-500">
                          총 {reportPreview.homework.totalAssignments}건 중 {reportPreview.homework.completedAssignments}건 완료 (평균 {reportPreview.homework.averageScore ?? '-'}점)
                        </p>
                      </div>
                    </div>

                    {/* Live Message Edit + Kakao Bubble Preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>발송 메시지 직접 수정 (편집 가능)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setEditableMessage(reportPreview.message)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer"
                          title="자동 계산된 기본 텍스트로 복원"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>기본 문구로 초기화</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Editor */}
                        <textarea
                          rows={8}
                          value={editableMessage}
                          onChange={(e) => setEditableMessage(e.target.value)}
                          placeholder="발송할 메시지를 확인하고 수정하세요..."
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                        />

                        {/* Kakao Preview Bubble */}
                        <div className="p-3.5 rounded-2xl bg-[#FAE100]/25 dark:bg-[#FAE100]/10 border border-[#FAE100] dark:border-amber-700/60 max-h-52 overflow-y-auto font-sans text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed shadow-xs">
                          {editableMessage || '메시지 본문이 여기에 표시됩니다.'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Send Success Result */}
                {studentSendResult && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>카카오 알림톡 발송 완료!</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      수신 번호: {studentSendResult.sentTo} (알림 ID #{studentSendResult.notificationId})
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  disabled={isSendingStudentReport}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  닫기
                </button>

                <button
                  type="button"
                  onClick={handleSendStudentReport}
                  disabled={isSendingStudentReport || !reportPreview}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingStudentReport ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>카카오 발송 중...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>카카오 알림톡 최종 발송</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
