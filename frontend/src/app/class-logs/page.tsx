'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Users,
  ChevronDown,
  Search,
  X,
  Loader2,
  BarChart3,
  Edit3,
  Trash2,
  Bookmark,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Plus,
  Send,
  Award,
  CheckCheck,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { classesService, ClassItem } from '@/lib/classes-service';
import {
  classLogsService,
  ClassLogItem,
  HomeworkStatus,
  StudentHomeworkHistoryResponse,
} from '@/lib/class-logs-service';
import { CustomDatePicker } from '@/components/CustomDatePicker';
import { AppLayout } from '@/components/common/AppLayout';

export default function ClassLogsPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();

  // State: Classes & Filters
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const classDropdownRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // State: Class Logs Data
  const [classLogs, setClassLogs] = useState<ClassLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // State: Collapsed Submissions per ClassLog (Accordion)
  const [expandedLogIds, setExpandedLogIds] = useState<Record<number, boolean>>({});

  // State: Homework Edit Form Data per ClassLog
  const [homeworkFormMap, setHomeworkFormMap] = useState<
    Record<
      number,
      Record<
        number,
        { status: HomeworkStatus; score: number | ''; feedback: string }
      >
    >
  >({});
  const [savingLogId, setSavingLogId] = useState<number | null>(null);

  // State: Create / Edit Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [logFormData, setLogFormData] = useState<{
    classId: number | '';
    date: string;
    curriculum: string;
    lessonContent: string;
    homework: string;
    notes: string;
  }>({
    classId: '',
    date: new Date().toISOString().split('T')[0],
    curriculum: '',
    lessonContent: '',
    homework: '',
    notes: '',
  });
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // State: Student Cumulative Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<StudentHomeworkHistoryResponse | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // State: Alerts
  const [alertInfo, setAlertInfo] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Authentication Guard
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Load Classes List
  const loadClasses = async () => {
    try {
      const res = await classesService.getClasses({ limit: 100, status: 'ACTIVE' });
      setClasses(res.items);
    } catch {
      showAlert('error', '반 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // Load Class Logs List
  const loadClassLogs = async () => {
    setIsLoading(true);
    try {
      const res = await classLogsService.getClassLogs({
        classId: selectedClassId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchTerm.trim() || undefined,
        limit: 50,
      });

      setClassLogs(res.items);
      setTotalCount(res.total);

      // Initialize homework edit state for each class log
      const initialFormMap: Record<
        number,
        Record<
          number,
          { status: HomeworkStatus; score: number | ''; feedback: string }
        >
      > = {};

      res.items.forEach((log) => {
        initialFormMap[log.id] = {};
        if (log.homeworkSubmissions) {
          log.homeworkSubmissions.forEach((sub) => {
            initialFormMap[log.id][sub.studentId] = {
              status: sub.status,
              score: sub.score !== null && sub.score !== undefined ? sub.score : '',
              feedback: sub.feedback || '',
            };
          });
        }
      });

      setHomeworkFormMap(initialFormMap);
    } catch {
      showAlert('error', '수업 일지 목록을 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadClasses();
    }
  }, [isHydrated, isAuthenticated]);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadClassLogs();
    }
  }, [isHydrated, isAuthenticated, selectedClassId, startDate, endDate]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target as Node)) {
        setIsClassDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlertInfo({ type, message });
    setTimeout(() => setAlertInfo(null), 4000);
  };

  // Toggle Accordion per ClassLog
  const toggleAccordion = (logId: number) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  // Handle Quick Homework Status Change in State
  const handleHomeworkStatusChange = (
    logId: number,
    studentId: number,
    status: HomeworkStatus,
    defaultScore?: number,
  ) => {
    setHomeworkFormMap((prev) => {
      const currentLogForm = prev[logId] || {};
      const currentStudentForm = currentLogForm[studentId] || {
        status: 'NOT_SUBMITTED',
        score: '',
        feedback: '',
      };

      let newScore = currentStudentForm.score;
      if (status === 'COMPLETED' && (newScore === '' || newScore === 0)) {
        newScore = defaultScore ?? 100;
      } else if (status === 'NOT_SUBMITTED' || status === 'EXCUSED') {
        newScore = '';
      }

      return {
        ...prev,
        [logId]: {
          ...currentLogForm,
          [studentId]: {
            ...currentStudentForm,
            status,
            score: newScore,
          },
        },
      };
    });
  };

  // Handle Homework Score Change
  const handleHomeworkScoreChange = (
    logId: number,
    studentId: number,
    value: string,
  ) => {
    const numeric = value === '' ? '' : Math.min(100, Math.max(0, parseInt(value, 10) || 0));
    setHomeworkFormMap((prev) => {
      const currentLogForm = prev[logId] || {};
      const currentStudentForm = currentLogForm[studentId] || {
        status: 'NOT_SUBMITTED',
        score: '',
        feedback: '',
      };

      return {
        ...prev,
        [logId]: {
          ...currentLogForm,
          [studentId]: {
            ...currentStudentForm,
            score: numeric,
          },
        },
      };
    });
  };

  // Handle Homework Feedback Change
  const handleHomeworkFeedbackChange = (
    logId: number,
    studentId: number,
    feedback: string,
  ) => {
    setHomeworkFormMap((prev) => {
      const currentLogForm = prev[logId] || {};
      const currentStudentForm = currentLogForm[studentId] || {
        status: 'NOT_SUBMITTED',
        score: '',
        feedback: '',
      };

      return {
        ...prev,
        [logId]: {
          ...currentLogForm,
          [studentId]: {
            ...currentStudentForm,
            feedback,
          },
        },
      };
    });
  };

  // Save Homework Submissions for a ClassLog
  const handleSaveHomeworkSubmissions = async (logId: number) => {
    const formForLog = homeworkFormMap[logId];
    if (!formForLog) return;

    setSavingLogId(logId);
    try {
      const submissions = Object.entries(formForLog).map(([sId, data]) => ({
        studentId: Number(sId),
        status: data.status,
        score: typeof data.score === 'number' ? data.score : undefined,
        feedback: data.feedback.trim() || undefined,
      }));

      await classLogsService.updateHomeworkSubmissions(logId, { submissions });
      showAlert('success', '과제 검사 결과 및 피드백이 저장되었습니다.');
      loadClassLogs();
    } catch {
      showAlert('error', '과제 결과를 저장하는 중 오류가 발생했습니다.');
    } finally {
      setSavingLogId(null);
    }
  };

  // Open Create/Edit Log Modal
  const handleOpenCreateModal = () => {
    setEditingLogId(null);
    setLogFormData({
      classId: selectedClassId || (classes.length > 0 ? classes[0].id : ''),
      date: new Date().toISOString().split('T')[0],
      curriculum: '',
      lessonContent: '',
      homework: '',
      notes: '',
    });
    setIsLogModalOpen(true);
  };

  const handleOpenEditModal = (log: ClassLogItem) => {
    setEditingLogId(log.id);
    setLogFormData({
      classId: log.classId,
      date: log.date,
      curriculum: log.curriculum,
      lessonContent: log.lessonContent || '',
      homework: log.homework || '',
      notes: log.notes || '',
    });
    setIsLogModalOpen(true);
  };

  // Submit Create/Edit Log Form
  const handleSubmitLogForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logFormData.classId || !logFormData.date || !logFormData.curriculum.trim()) {
      showAlert('error', '수업 반, 일자, 교재/진도 범위는 필수 입력 항목입니다.');
      return;
    }

    setIsSubmittingLog(true);
    try {
      if (editingLogId) {
        await classLogsService.updateClassLog(editingLogId, {
          classId: Number(logFormData.classId),
          date: logFormData.date,
          curriculum: logFormData.curriculum.trim(),
          lessonContent: logFormData.lessonContent.trim() || undefined,
          homework: logFormData.homework.trim() || undefined,
          notes: logFormData.notes.trim() || undefined,
        });
        showAlert('success', '수업 일지가 수정되었습니다.');
      } else {
        await classLogsService.createClassLog({
          classId: Number(logFormData.classId),
          date: logFormData.date,
          curriculum: logFormData.curriculum.trim(),
          lessonContent: logFormData.lessonContent.trim() || undefined,
          homework: logFormData.homework.trim() || undefined,
          notes: logFormData.notes.trim() || undefined,
        });
        showAlert('success', '새 수업 일지가 작성되고 수강생 과제 목록이 생성되었습니다.');
      }

      setIsLogModalOpen(false);
      loadClassLogs();
    } catch {
      showAlert('error', '수업 일지를 저장하는 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Delete Class Log
  const handleDeleteLog = async (id: number) => {
    if (!confirm('정말로 이 수업 일지와 연결된 과제 검사 내역을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await classLogsService.deleteClassLog(id);
      showAlert('success', '수업 일지가 삭제되었습니다.');
      loadClassLogs();
    } catch {
      showAlert('error', '수업 일지 삭제 중 오류가 발생했습니다.');
    }
  };

  // Open Cumulative Homework Report Modal for a Student
  const handleOpenStudentReport = async (studentId: number) => {
    setIsLoadingReport(true);
    setIsReportModalOpen(true);
    try {
      const data = await classLogsService.getStudentHomeworkHistory(studentId);
      setReportData(data);
    } catch {
      showAlert('error', '학생 과제 누적 리포트를 불러오지 못했습니다.');
      setIsReportModalOpen(false);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // Overall Statistics Calculation
  const totalLogsCount = classLogs.length;
  const overallAvgCompletionRate =
    classLogs.length > 0
      ? Number(
          (
            classLogs.reduce((acc, log) => acc + (log.completionRate || 0), 0) /
            classLogs.length
          ).toFixed(1),
        )
      : 0;

  const logsWithAverageScore = classLogs.filter((l) => l.averageScore !== undefined);
  const overallAvgScore =
    logsWithAverageScore.length > 0
      ? Number(
          (
            logsWithAverageScore.reduce((acc, log) => acc + (log.averageScore || 0), 0) /
            logsWithAverageScore.length
          ).toFixed(1),
        )
      : null;

  const totalAssignedStudents = classLogs.reduce(
    (acc, log) => acc + (log.totalStudents || 0),
    0,
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <AppLayout currentPath="/class-logs">
      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Toast Alert */}
        {alertInfo && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm font-medium transition-all shadow-xs ${
              alertInfo.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {alertInfo.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{alertInfo.message}</span>
            </div>
            <button
              onClick={() => setAlertInfo(null)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header Banner & Stats Cards */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>수업 일지 및 과제 관리</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Phase 3-6
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                매 수업의 교재 진도와 과제를 기록하고, 원생별 숙제 검사 결과 및 피드백을 축적합니다.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>새 수업 일지 작성</span>
            </button>
          </div>

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. 총 일지 수 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  수업 일지 작성 수
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {totalLogsCount}
                  <span className="text-xs font-normal text-slate-400 ml-1">건</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* 2. 평균 과제 완료율 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  평균 과제 완료율
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {overallAvgCompletionRate}
                  <span className="text-xs font-normal text-slate-400 ml-1">%</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            {/* 3. 평균 과제 점수 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  평균 과제 점수
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                  {overallAvgScore !== null ? overallAvgScore : '-'}
                  {overallAvgScore !== null && (
                    <span className="text-xs font-normal text-slate-400 ml-1">점</span>
                  )}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
            </div>

            {/* 4. 점검 대상 학생 수 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  누적 점검 학생
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {totalAssignedStudents}
                  <span className="text-xs font-normal text-slate-400 ml-1">명</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* 1. 수업 반 선택 */}
            <div className="md:col-span-4 relative" ref={classDropdownRef}>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                수업 반 필터
              </label>
              <button
                type="button"
                onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-left font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  {selectedClass ? (
                    <span className="truncate">
                      {selectedClass.name}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
                        ({selectedClass.schedule || '시간표 미정'})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300">
                      전체 수업 반 일지 보기
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                    isClassDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isClassDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 max-h-64 overflow-y-auto space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClassId(null);
                      setIsClassDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-left cursor-pointer ${
                      selectedClassId === null
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>전체 수업 반 보기</span>
                  </button>

                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setIsClassDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-left cursor-pointer ${
                        selectedClassId === cls.id
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{cls.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {cls.enrolledCount}명
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Date Range Filter */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                조회 기간
              </label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <CustomDatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    placeholder="시작일"
                  />
                </div>
                <span className="text-slate-400 text-xs">~</span>
                <div className="flex-1">
                  <CustomDatePicker
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    placeholder="종료일"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="기간 초기화"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 3. Search Keyword */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                진도 / 숙제 키워드 검색
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="교재명, 단원, 과제 내용..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadClassLogs()}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Class Logs Feed List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>수업 일지 피드</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                총 {totalCount}개
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                수업 일지 및 과제 데이터를 불러오는 중입니다...
              </p>
            </div>
          ) : classLogs.length === 0 ? (
            <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                등록된 수업 일지가 없습니다
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                우측 상단의 [+ 새 수업 일지 작성] 버튼을 눌러 오늘 진행한 수업 진도와 과제를 등록해보세요.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>지금 일지 작성하기</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {classLogs.map((log) => {
                const isExpanded = Boolean(expandedLogIds[log.id]);
                const submissions = log.homeworkSubmissions || [];
                const formForLog = homeworkFormMap[log.id] || {};
                const isSavingThisLog = savingLogId === log.id;

                return (
                  <div
                    key={log.id}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-200 hover:border-indigo-200 dark:hover:border-indigo-900"
                  >
                    {/* Log Card Header */}
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Date Badge */}
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{log.date}</span>
                          </div>

                          {/* Class Name */}
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">
                            {log.class?.name || '수업 반'}
                          </span>

                          {/* Teacher Name */}
                          {log.teacher && (
                            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              담당: {log.teacher.name}
                            </span>
                          )}
                        </div>

                        {/* Action buttons (Edit / Delete) */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(log)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                            title="수업 일지 수정"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                            title="수업 일지 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content Sections: Curriculum, Lesson Content, Homework, Notes */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                        {/* 1. 교재 & 진도 범위 */}
                        <div className="md:col-span-12 p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/60 flex items-start gap-2.5">
                          <Bookmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-indigo-950 dark:text-indigo-200 block mb-0.5">
                              교재 및 진도 범위
                            </span>
                            <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                              {log.curriculum}
                            </p>
                          </div>
                        </div>

                        {/* 2. 수업 핵심 내용 */}
                        {log.lessonContent && (
                          <div className="md:col-span-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-500 dark:text-slate-400 block mb-1">
                              📝 수업 핵심 내용 요약
                            </span>
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                              {log.lessonContent}
                            </p>
                          </div>
                        )}

                        {/* 3. 과제 공지 */}
                        {log.homework && (
                          <div className="md:col-span-6 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                              🎯 당일 부여 과제 (숙제)
                            </span>
                            <p className="text-slate-800 dark:text-slate-200 font-medium whitespace-pre-line leading-relaxed">
                              {log.homework}
                            </p>
                          </div>
                        )}

                        {/* 4. 특이사항 */}
                        {log.notes && (
                          <div className="md:col-span-12 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                            <span className="font-semibold mr-1">💡 특이사항:</span>
                            <span>{log.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Homework Progress Bar & Quick Stats */}
                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            과제 완료율: {log.completionRate ?? 0}%
                          </span>

                          <div className="w-28 sm:w-36 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, log.completionRate ?? 0)}%` }}
                            />
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              완료 {log.completedCount ?? 0}명
                            </span>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400">
                              미흡 {log.incompleteCount ?? 0}명
                            </span>
                            <span>•</span>
                            <span className="text-rose-600 dark:text-rose-400">
                              미제출 {log.notSubmittedCount ?? 0}명
                            </span>
                            {log.averageScore !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                  평균 {log.averageScore}점
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Toggle Submissions Accordion Button */}
                        <button
                          type="button"
                          onClick={() => toggleAccordion(log.id)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                        >
                          <span>원생별 과제 검사 ({submissions.length}명)</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Submissions Checkboard (Accordion Dropdown) */}
                    {isExpanded && (
                      <div className="p-5 sm:p-6 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <CheckCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>원생별 1초 과제 검사 & 개별 피드백</span>
                          </h4>

                          <button
                            type="button"
                            onClick={() => handleSaveHomeworkSubmissions(log.id)}
                            disabled={isSavingThisLog}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSavingThisLog ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>과제 검사 저장</span>
                          </button>
                        </div>

                        {submissions.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            이 반에 배정된 수강생이 없습니다.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {submissions.map((sub) => {
                              const student = sub.student;
                              const currentFormData = formForLog[sub.studentId] || {
                                status: sub.status,
                                score: sub.score ?? '',
                                feedback: sub.feedback || '',
                              };

                              return (
                                <div
                                  key={sub.studentId}
                                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                  {/* Student Info & Cumulative Report Button */}
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                                      {student ? student.name.slice(0, 1) : '?'}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                                          {student?.name || '원생'}
                                        </span>
                                        {student?.grade && (
                                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                            {student.grade}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenStudentReport(sub.studentId)}
                                          className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 font-semibold cursor-pointer transition-colors"
                                        >
                                          누적 리포트
                                        </button>
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-0.5">
                                        {student?.parentPhone}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 1-Second Status Toggle Buttons */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleHomeworkStatusChange(
                                          log.id,
                                          sub.studentId,
                                          'COMPLETED',
                                          100,
                                        )
                                      }
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                        currentFormData.status === 'COMPLETED'
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                                      }`}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>완료 (100점)</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleHomeworkStatusChange(
                                          log.id,
                                          sub.studentId,
                                          'INCOMPLETE',
                                          70,
                                        )
                                      }
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                        currentFormData.status === 'INCOMPLETE'
                                          ? 'bg-amber-500 text-white shadow-xs'
                                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
                                      }`}
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <span>미흡</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleHomeworkStatusChange(
                                          log.id,
                                          sub.studentId,
                                          'NOT_SUBMITTED',
                                        )
                                      }
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                        currentFormData.status === 'NOT_SUBMITTED'
                                          ? 'bg-rose-600 text-white shadow-xs'
                                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
                                      }`}
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>미제출</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleHomeworkStatusChange(
                                          log.id,
                                          sub.studentId,
                                          'EXCUSED',
                                        )
                                      }
                                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        currentFormData.status === 'EXCUSED'
                                          ? 'bg-purple-600 text-white shadow-xs'
                                          : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100'
                                      }`}
                                    >
                                      <span>면제</span>
                                    </button>
                                  </div>

                                  {/* Score & Feedback Inputs */}
                                  <div className="flex items-center gap-2 flex-1 max-w-md">
                                    {/* Score Input */}
                                    <div className="w-20 shrink-0">
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        placeholder="점수"
                                        value={currentFormData.score}
                                        onChange={(e) =>
                                          handleHomeworkScoreChange(
                                            log.id,
                                            sub.studentId,
                                            e.target.value,
                                          )
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-center font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>

                                    {/* Feedback Comment Input */}
                                    <div className="flex-1">
                                      <input
                                        type="text"
                                        placeholder="개별 맞춤 코멘트 (예: 오답노트 우수)"
                                        value={currentFormData.feedback}
                                        onChange={(e) =>
                                          handleHomeworkFeedbackChange(
                                            log.id,
                                            sub.studentId,
                                            e.target.value,
                                          )
                                        }
                                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 1. Modal: Create / Edit Class Log */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingLogId ? '수업 일지 수정' : '새 수업 일지 작성'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLogForm} className="space-y-4">
              {/* Class & Date Selection Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    수업 반 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={logFormData.classId}
                    onChange={(e) =>
                      setLogFormData({
                        ...logFormData,
                        classId: Number(e.target.value) || '',
                      })
                    }
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">수업 반을 선택하세요</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.schedule || '시간표 미정'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    수업 일자 <span className="text-rose-500">*</span>
                  </label>
                  <CustomDatePicker
                    value={logFormData.date}
                    onChange={(newDate) =>
                      setLogFormData({ ...logFormData, date: newDate })
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              {/* Curriculum */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  교재 및 진도 범위 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="예: 개념원리 수학(상) p.45~62 다항식의 연산"
                  value={logFormData.curriculum}
                  onChange={(e) =>
                    setLogFormData({ ...logFormData, curriculum: e.target.value })
                  }
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Lesson Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  수업 핵심 내용 요약
                </label>
                <textarea
                  rows={3}
                  placeholder="당일 진행한 핵심 개념 및 예제 풀이 내용"
                  value={logFormData.lessonContent}
                  onChange={(e) =>
                    setLogFormData({ ...logFormData, lessonContent: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Homework Assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  당일 부여 과제 (숙제)
                </label>
                <textarea
                  rows={2}
                  placeholder="예: 워크북 p.20~24 짝수번 풀기 및 오답노트 작성"
                  value={logFormData.homework}
                  onChange={(e) =>
                    setLogFormData({ ...logFormData, homework: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  특이사항 및 메모
                </label>
                <input
                  type="text"
                  placeholder="수업 집중도, 다음 시간 쪽지시험 공지 등"
                  value={logFormData.notes}
                  onChange={(e) =>
                    setLogFormData({ ...logFormData, notes: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLog && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingLogId ? '수정 완료' : '수업 일지 등록'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Student Cumulative Homework Report */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/80 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {reportData ? `${reportData.studentName} 학생 과제 누적 리포트` : '과제 성취도 리포트'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    학부모 정기 상담 및 성취도 평가 자료로 활용할 수 있습니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingReport ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="text-xs">누적 과제 이력을 집계 중입니다...</span>
              </div>
            ) : !reportData || reportData.history.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                누적된 과제 평가 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Stats Header Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 text-center">
                    <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                      총 부여 과제
                    </p>
                    <p className="text-xl font-extrabold text-purple-950 dark:text-purple-100 mt-0.5">
                      {reportData.totalAssignments}
                      <span className="text-xs font-normal ml-0.5">회</span>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-center">
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      과제 완성률
                    </p>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {reportData.completionRate}%
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-center">
                    <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                      평균 점수
                    </p>
                    <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {reportData.averageScore !== null ? `${reportData.averageScore}점` : '-'}
                    </p>
                  </div>
                </div>

                {/* History Timeline List */}
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData.history.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.date}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {item.className} ({item.teacherName})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {item.status === 'COMPLETED' && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                              완료 {item.score !== null && `(${item.score}점)`}
                            </span>
                          )}
                          {item.status === 'INCOMPLETE' && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                              미흡 {item.score !== null && `(${item.score}점)`}
                            </span>
                          )}
                          {item.status === 'NOT_SUBMITTED' && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                              미제출
                            </span>
                          )}
                          {item.status === 'EXCUSED' && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                              면제
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-700 dark:text-slate-200">진도:</strong> {item.curriculum}
                      </p>
                      {item.homework && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <strong>과제:</strong> {item.homework}
                        </p>
                      )}
                      {item.feedback && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-950/30 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                          💬 <strong>강사 피드백:</strong> {item.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
