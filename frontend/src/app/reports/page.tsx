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
  ChevronRight,
  TrendingUp,
  Check,
  Smartphone,
  Info,
  CalendarCheck2,
  Clock,
  ArrowRight,
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
import { AppLayout } from '@/components/common/AppLayout';

export default function ReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();

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

  // Class Batch Send State & Modal
  const [selectedClassForBatch, setSelectedClassForBatch] = useState<ClassItem | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<ClassReportSendResult | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Student Single Report State & Modal
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<StudentItem | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentPeriodStart, setStudentPeriodStart] = useState<string>('');
  const [studentPeriodEnd, setStudentPeriodEnd] = useState<string>('');
  const [reportPreview, setReportPreview] = useState<StudentReport | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSendingStudentReport, setIsSendingStudentReport] = useState(false);
  const [studentSendResult, setStudentSendResult] = useState<SendReportResult | null>(null);
  const [studentReportError, setStudentReportError] = useState<string | null>(null);

  // Student Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');

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
      start = firstDay.toISOString().split('T')[0];
      end = now.toISOString().split('T')[0];
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
    } else if (preset === 'LAST_7_DAYS') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      start = past7.toISOString().split('T')[0];
      end = now.toISOString().split('T')[0];
    }

    setGlobalStart(start);
    setGlobalEnd(end);
  };

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

  // Handle Class Batch Send Modal
  const handleOpenBatchModal = (cls: ClassItem) => {
    setSelectedClassForBatch(cls);
    setIsBatchModalOpen(true);
    setBatchResult(null);
    setBatchError(null);
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

    const start = globalStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = globalEnd || new Date().toISOString().split('T')[0];

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

  return (
    <AppLayout currentPath="/reports">
      <div className="space-y-6">
        {/* Top Title & Tab Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <span>학습 & 출결 리포트 관리</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              기간별 출결 및 과제 데이터를 종합 집계하여 학부모님께 카카오 알림톡으로 정기 리포트를 전송합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">관리 대상 재원생</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {students.filter((s) => s.status === 'ACTIVE').length}명
              </span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                총 {students.length}명
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
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

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">알림톡 발송 엔진</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                카카오 연동 정상
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                실시간 발송 ON
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">권장 발송 주기</span>
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

        {/* Global Period Selector Toolbar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 dark:text-white">리포트 대상 기간</p>
              <p className="text-[11px] text-slate-400">선택한 기간의 출결 및 과제 데이터가 리포트에 반영됩니다.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Presets */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => applyPreset('THIS_MONTH')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodPreset === 'THIS_MONTH'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                이번 달
              </button>
              <button
                type="button"
                onClick={() => applyPreset('LAST_MONTH')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodPreset === 'LAST_MONTH'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                지난 달
              </button>
              <button
                type="button"
                onClick={() => applyPreset('LAST_7_DAYS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodPreset === 'LAST_7_DAYS'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                최근 7일
              </button>
            </div>

            {/* Custom Range Inputs */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={globalStart}
                onChange={(e) => {
                  setGlobalStart(e.target.value);
                  setPeriodPreset('CUSTOM');
                }}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-slate-400 font-bold">~</span>
              <input
                type="date"
                value={globalEnd}
                onChange={(e) => {
                  setGlobalEnd(e.target.value);
                  setPeriodPreset('CUSTOM');
                }}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('CLASSES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CLASSES'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>반별 일괄 발송 ({classes.length}개 반)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STUDENTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'STUDENTS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>원생별 개별 발송 & 미리보기 ({students.length}명)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GUIDE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'GUIDE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>템플릿 & 발송 가이드</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: 반별 일괄 발송 뷰 (Classes Batch Send)             */}
        {/* ========================================================= */}
        {activeTab === 'CLASSES' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-purple-600" />
                <span>반 목록을 불러오는 중...</span>
              </div>
            ) : classes.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 space-y-2">
                <p>등록된 수업 반이 없습니다.</p>
                <Link
                  href="/classes"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
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
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] border border-purple-200 dark:border-purple-800">
                          {cls.subject || '과목 미지정'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          재원생 {cls.enrolledCount}명
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        대상: {cls.targetGrade || '전체 학년'} • 시간표: {cls.schedule || '시간표 미지정'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        기간: {globalStart} ~ {globalEnd}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenBatchModal(cls)}
                        disabled={cls.enrolledCount === 0}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>반 전체 발송</span>
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
            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="원생 이름, 학부모 연락처, 학교 검색..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
              >
                <option value="ALL">전체 반 원생 보기</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={String(cls.id)}>
                    {cls.name} ({cls.enrolledCount}명)
                  </option>
                ))}
              </select>
            </div>

            {/* Students Table */}
            {isLoading ? (
              <div className="py-20 text-center text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-purple-600" />
                <span>원생 목록을 불러오는 중...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400">
                일치하는 원생이 없습니다.
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800/80 transition-colors cursor-pointer text-xs"
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
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  카카오 알림톡 정기 리포트 메시지 구조
                </h3>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ClassHelper 리포트는 원생의 지정 기간 출결 기록(출석/지각/조퇴/결석)과 과제 수행 기록을 백엔드에서 실시간 집계하여 자동으로 알림톡 규격에 맞는 안내 메시지를 생성합니다.
              </p>

              {/* Sample Message Preview Card */}
              <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 max-w-lg mx-auto shadow-xs text-slate-800 dark:text-slate-200 text-xs font-sans whitespace-pre-wrap leading-relaxed">
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

        {/* ========================================================= */}
        {/* MODAL 1: 반별 일괄 발송 확인 및 결과 모달               */}
        {/* ========================================================= */}
        {isBatchModalOpen && selectedClassForBatch && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSendingBatch) setIsBatchModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      반 전체 리포트 일괄 발송
                    </h3>
                    <p className="text-xs text-slate-400">
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

              <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    발송 대상 기간: <span className="text-purple-600 dark:text-purple-400">{globalStart} ~ {globalEnd}</span>
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    반에 속한 모든 원생의 해당 기간 출결/과제 데이터가 카카오 알림톡으로 전송됩니다.
                  </p>
                </div>

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
                          <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                            <span className="font-bold">{f.studentName}</span>
                            <span className="text-rose-600">{f.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
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
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingBatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>발송 처리 중...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>반 재원생 전원 발송</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: 원생 1인 리포트 미리보기 & 발송 모달             */}
        {/* ========================================================= */}
        {isStudentModalOpen && selectedStudentForReport && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSendingStudentReport) setIsStudentModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{selectedStudentForReport.name} 학생 리포트</span>
                    </h3>
                    <p className="text-xs text-slate-400">
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

              <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                {/* Period Selector */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={studentPeriodStart}
                    onChange={(e) => setStudentPeriodStart(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  <span className="text-slate-400 font-bold">~</span>
                  <input
                    type="date"
                    value={studentPeriodEnd}
                    onChange={(e) => setStudentPeriodEnd(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStudentForReport && studentPeriodStart && studentPeriodEnd) {
                        fetchStudentPreview(selectedStudentForReport.id, studentPeriodStart, studentPeriodEnd);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold hover:bg-slate-200 text-xs"
                  >
                    미리보기 갱신
                  </button>
                </div>

                {studentSendResult && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-start gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">발송 완료</p>
                      <p className="text-[11px] mt-0.5">
                        학부모({studentSendResult.sentTo})님께 카카오 알림톡이 성공적으로 발송되었습니다.
                      </p>
                    </div>
                  </div>
                )}

                {studentReportError && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{studentReportError}</span>
                  </div>
                )}

                {/* Live Preview */}
                {isLoadingPreview ? (
                  <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>출결 및 과제 데이터를 집계하여 리포트를 생성하는 중...</span>
                  </div>
                ) : reportPreview ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                        <span className="text-[10px] text-slate-400 font-medium">출석률</span>
                        <div className="flex items-baseline justify-between mt-0.5">
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">
                            {reportPreview.attendance.attendanceRate}%
                          </span>
                          <span className="text-[11px] text-emerald-600 font-semibold">
                            {reportPreview.attendance.presentCount}/{reportPreview.attendance.totalDays}일
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                        <span className="text-[10px] text-slate-400 font-medium">과제 완수율</span>
                        <div className="flex items-baseline justify-between mt-0.5">
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">
                            {reportPreview.homework.completionRate}%
                          </span>
                          <span className="text-[11px] text-indigo-600 font-semibold">
                            {reportPreview.homework.completedAssignments}/{reportPreview.homework.totalAssignments}건
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-xs leading-relaxed font-sans shadow-2xs">
                      {reportPreview.message}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  disabled={isSendingStudentReport}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  닫기
                </button>

                <button
                  type="button"
                  onClick={handleSendStudentReport}
                  disabled={isSendingStudentReport || !reportPreview || isLoadingPreview}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingStudentReport ? (
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
      </div>
    </AppLayout>
  );
}
