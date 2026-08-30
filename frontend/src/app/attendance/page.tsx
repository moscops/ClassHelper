'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Building2,
  BookOpen,
  Users,
  CalendarCheck2,
  Clock,
  LogOut,
  Sparkles,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DoorOpen,
  RefreshCw,
  Search,
  X,
  Loader2,
  BarChart3,
  Edit3,
  Bookmark,
  MessageSquare,
  CheckCheck,
  LayoutGrid,
  Rows3,
  Home,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/lib/auth-service';
import { classesService, ClassItem } from '@/lib/classes-service';
import {
  attendanceService,
  AttendanceStatus,
  ClassDailyRoster,
  ClassRosterStudent,
  AttendanceStats,
  AttendanceItem,
  UnattendedStatusResponse,
} from '@/lib/attendance-service';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { CustomDatePicker } from '@/components/CustomDatePicker';

export interface TimelineStudentItem extends ClassRosterStudent {
  classId: number;
  className: string;
  schedule?: string | null;
  room?: string | null;
}

export interface TimeSlotGroup {
  timeSlot: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  status: 'CURRENT' | 'UPCOMING' | 'PAST';
  classes: Array<{
    classId: number;
    className: string;
    room?: string | null;
    subject?: string | null;
    schedule?: string | null;
  }>;
  students: TimelineStudentItem[];
  totalStudents: number;
  presentCount: number;
  unattendedCount: number;
  absentCount: number;
  lateCount: number;
  earlyLeaveCount: number;
}

export default function AttendancePage() {
  const router = useRouter();
  const { user, academy, isAuthenticated, isHydrated, logout } = useAuthStore();

  // Mode & Layout States
  const [displayMode, setDisplayMode] = useState<'TIMELINE' | 'CLASS'>('TIMELINE');
  const [viewLayout, setViewLayout] = useState<'LARGE_LIST' | 'CARD'>('LARGE_LIST');

  // State: Classes & Selection
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const classDropdownRef = useRef<HTMLDivElement>(null);

  // State: Date & Roster
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [roster, setRoster] = useState<ClassDailyRoster | null>(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus | 'UNMARKED'>('ALL');

  // State: Timeline Data (All classes on the selected date)
  const [timelineRosters, setTimelineRosters] = useState<ClassDailyRoster[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // State: Collapsed Time Slots (Accordion State)
  const [collapsedSlots, setCollapsedSlots] = useState<Record<string, boolean>>({});

  const toggleTimeSlotCollapse = (slotKey: string) => {
    setCollapsedSlots((prev) => ({
      ...prev,
      [slotKey]: !prev[slotKey],
    }));
  };

  const handleExpandAllSlots = () => {
    setCollapsedSlots({});
  };

  const handleCollapseAllSlots = () => {
    const allCollapsed: Record<string, boolean> = {};
    timeSlotGroups.forEach((g) => {
      allCollapsed[g.timeSlot] = true;
    });
    setCollapsedSlots(allCollapsed);
  };

  // State: Quick Action Loading
  const [actionLoadingStudentId, setActionLoadingStudentId] = useState<number | null>(null);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  // State: Detail / Makeup Modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<ClassRosterStudent | null>(null);
  const [detailModalClassId, setDetailModalClassId] = useState<number | null>(null);
  const [detailFormData, setDetailFormData] = useState<{
    status: AttendanceStatus;
    checkInTime: string;
    checkOutTime: string;
    reason: string;
    isMakeupNeeded: boolean;
    isMakeupCompleted: boolean;
    memo: string;
  }>({
    status: 'PRESENT',
    checkInTime: '',
    checkOutTime: '',
    reason: '',
    isMakeupNeeded: false,
    isMakeupCompleted: false,
    memo: '',
  });
  const [isSavingDetail, setIsSavingDetail] = useState(false);

  // State: Stats Modal
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsData, setStatsData] = useState<AttendanceStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // State: Unattended Alert Status
  const [unattendedStatus, setUnattendedStatus] = useState<UnattendedStatusResponse>({
    isUnattendedAlertActive: false,
    unattendedCount: 0,
    unattendedStudents: [],
  });
  const [isTriggeringKakao, setIsTriggeringKakao] = useState(false);

  // Authentication Guard
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target as Node)) {
        setIsClassDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load classes list & timeline data
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadClasses();
      loadTimelineData(selectedDate);
      loadUnattendedStatus(selectedDate);
    }
  }, [isHydrated, isAuthenticated, selectedDate]);

  // Load roster when selected class changes in CLASS mode
  useEffect(() => {
    if (selectedClassId) {
      loadRoster(selectedClassId, selectedDate);
    }
  }, [selectedClassId, selectedDate]);

  const loadUnattendedStatus = async (date: string) => {
    try {
      const data = await attendanceService.getUnattendedStatus(date);
      setUnattendedStatus(data);
    } catch {
      // ignore
    }
  };

  const handleTriggerUnattendedKakao = async () => {
    setIsTriggeringKakao(true);
    try {
      const res = await attendanceService.triggerUnattendedAlerts(selectedDate);
      alert(res.message);
      await loadUnattendedStatus(selectedDate);
    } catch (err: any) {
      alert(err.response?.data?.message || '카카오 알림톡 발송 중 오류가 발생했습니다.');
    } finally {
      setIsTriggeringKakao(false);
    }
  };

  const loadClasses = async () => {
    try {
      const data = await classesService.getClasses({ limit: 100, status: 'ACTIVE' });
      const activeClasses = data.items || [];
      setClasses(activeClasses);
      if (activeClasses.length > 0 && !selectedClassId) {
        setSelectedClassId(activeClasses[0].id);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadRoster = async (classId: number, date: string) => {
    setIsLoadingRoster(true);
    try {
      const data = await attendanceService.getClassDailyRoster(classId, date);
      setRoster(data);
      await loadUnattendedStatus(date);
    } catch (err) {
      console.error('Failed to load attendance roster:', err);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const loadTimelineData = async (date: string) => {
    setIsLoadingTimeline(true);
    try {
      const classListRes = await classesService.getClasses({ limit: 100, status: 'ACTIVE' });
      const activeClasses = classListRes.items || [];

      // Concurrently load all rosters
      const rosters = await Promise.all(
        activeClasses.map(async (cls) => {
          try {
            return await attendanceService.getClassDailyRoster(cls.id, date);
          } catch {
            return null;
          }
        }),
      );

      const validRosters = rosters.filter((r): r is ClassDailyRoster => r !== null);
      setTimelineRosters(validRosters);
    } catch (err) {
      console.error('Failed to load timeline rosters:', err);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {}
    logout();
    router.push('/login');
  };

  // Date Navigation Helpers
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Parse time slot helper
  const parseScheduleTime = (scheduleStr?: string | null) => {
    if (!scheduleStr) {
      return {
        displaySlot: '시간 미지정',
        startMin: 9999,
        endMin: 9999,
      };
    }

    // Match times like 17:00, 17:00-19:00, 17:00~19:00, 17:00 - 19:00
    const timeMatch = scheduleStr.match(/(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const start = timeMatch[1];
      const end = timeMatch[2];
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return {
        displaySlot: `${start} - ${end}`,
        startMin: sh * 60 + sm,
        endMin: eh * 60 + em,
      };
    }

    const singleTimeMatch = scheduleStr.match(/(\d{1,2}:\d{2})/);
    if (singleTimeMatch) {
      const start = singleTimeMatch[1];
      const [sh, sm] = start.split(':').map(Number);
      return {
        displaySlot: `${start} 시작`,
        startMin: sh * 60 + sm,
        endMin: sh * 60 + sm + 90, // default 90m
      };
    }

    return {
      displaySlot: scheduleStr,
      startMin: 9999,
      endMin: 9999,
    };
  };

  // Group all students by Time Slots for the selected date
  const timeSlotGroups: TimeSlotGroup[] = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStr = now.toISOString().slice(0, 10);
    const isViewingToday = selectedDate === todayStr;

    const groupMap = new Map<string, TimeSlotGroup>();

    for (const r of timelineRosters) {
      const classInfo = r.class;
      const parsed = parseScheduleTime(classInfo.schedule);
      const slotKey = parsed.displaySlot;

      let group = groupMap.get(slotKey);
      if (!group) {
        let status: 'CURRENT' | 'UPCOMING' | 'PAST' = 'UPCOMING';
        if (isViewingToday && parsed.startMin !== 9999) {
          if (nowMinutes >= parsed.startMin && nowMinutes <= parsed.endMin) {
            status = 'CURRENT';
          } else if (nowMinutes > parsed.endMin) {
            status = 'PAST';
          } else {
            status = 'UPCOMING';
          }
        }

        group = {
          timeSlot: slotKey,
          startTimeMinutes: parsed.startMin,
          endTimeMinutes: parsed.endMin,
          status,
          classes: [],
          students: [],
          totalStudents: 0,
          presentCount: 0,
          unattendedCount: 0,
          absentCount: 0,
          lateCount: 0,
          earlyLeaveCount: 0,
        };
        groupMap.set(slotKey, group);
      }

      group.classes.push({
        classId: classInfo.id,
        className: classInfo.name,
        room: classInfo.room,
        subject: classInfo.subject,
        schedule: classInfo.schedule,
      });

      for (const st of r.students) {
        group.students.push({
          ...st,
          classId: classInfo.id,
          className: classInfo.name,
          schedule: classInfo.schedule,
          room: classInfo.room,
        });
        group.totalStudents++;

        if (st.attendance?.status === 'PRESENT') group.presentCount++;
        else if (st.attendance?.status === 'ABSENT') group.absentCount++;
        else if (st.attendance?.status === 'LATE') group.lateCount++;
        else if (st.attendance?.status === 'EARLY_LEAVE') group.earlyLeaveCount++;
        else group.unattendedCount++;
      }
    }

    return Array.from(groupMap.values()).sort((a, b) => a.startTimeMinutes - b.startTimeMinutes);
  }, [timelineRosters, selectedDate]);

  // 1-Second Quick Check Action (Present, Late, Absent, Early Leave)
  const handleQuickStatusChange = async (
    studentId: number,
    newStatus: AttendanceStatus,
    targetClassId?: number,
  ) => {
    const classIdToUse = targetClassId || selectedClassId;
    if (!classIdToUse) return;
    setActionLoadingStudentId(studentId);

    const now = new Date();
    const nowIso = now.toISOString();

    try {
      await attendanceService.recordAttendance({
        studentId,
        classId: classIdToUse,
        date: selectedDate,
        status: newStatus,
        checkInTime: newStatus !== 'ABSENT' ? nowIso : undefined,
        isMakeupNeeded: newStatus === 'ABSENT',
      });

      if (displayMode === 'TIMELINE') {
        await loadTimelineData(selectedDate);
      }
      if (selectedClassId) {
        await loadRoster(selectedClassId, selectedDate);
      }
      await loadUnattendedStatus(selectedDate);
    } catch (err: any) {
      alert(err.response?.data?.message || '출결 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingStudentId(null);
    }
  };

  // 1-Second Check-out (하원)
  const handleQuickCheckOut = async (studentId: number, targetClassId?: number) => {
    const classIdToUse = targetClassId || selectedClassId;
    if (!classIdToUse) return;
    setActionLoadingStudentId(studentId);

    const nowIso = new Date().toISOString();

    try {
      await attendanceService.quickCheck({
        studentId,
        classId: classIdToUse,
        type: 'CHECK_OUT',
        date: selectedDate,
        time: nowIso,
      });

      if (displayMode === 'TIMELINE') {
        await loadTimelineData(selectedDate);
      }
      if (selectedClassId) {
        await loadRoster(selectedClassId, selectedDate);
      }
      await loadUnattendedStatus(selectedDate);
    } catch (err: any) {
      alert(err.response?.data?.message || '하원 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingStudentId(null);
    }
  };

  // Batch Check-in for a Time Slot
  const handleBatchPresentForTimeSlot = async (group: TimeSlotGroup) => {
    if (group.students.length === 0) return;
    if (!confirm(`[${group.timeSlot}] 시간대의 전체 수강생(${group.students.length}명)을 오늘 출석(등원)으로 일괄 처리하시겠습니까?`)) {
      return;
    }

    setIsBatchLoading(true);
    const nowIso = new Date().toISOString();

    try {
      const classMap = new Map<number, number[]>();
      group.students.forEach((st) => {
        const list = classMap.get(st.classId) || [];
        list.push(st.studentId);
        classMap.set(st.classId, list);
      });

      for (const [classId, studentIds] of classMap.entries()) {
        const records = studentIds.map((sid) => ({
          studentId: sid,
          status: 'PRESENT' as AttendanceStatus,
          checkInTime: nowIso,
        }));
        await attendanceService.batchRecordAttendance({
          classId,
          date: selectedDate,
          records,
        });
      }

      await loadTimelineData(selectedDate);
      if (selectedClassId) {
        await loadRoster(selectedClassId, selectedDate);
      }
      await loadUnattendedStatus(selectedDate);
    } catch (err: any) {
      alert(err.response?.data?.message || '시간대 일괄 출결 처리 중 오류가 발생했습니다.');
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Batch Check-in for current class
  const handleBatchAllPresent = async () => {
    if (!selectedClassId || !roster || roster.students.length === 0) return;

    if (
      !confirm(
        `[${roster.class.name}] 반의 수강생 전체(${roster.students.length}명)를 오늘 출석(등원)으로 일괄 처리하시겠습니까?`,
      )
    ) {
      return;
    }

    setIsBatchLoading(true);
    const nowIso = new Date().toISOString();

    try {
      const records = roster.students.map((st) => ({
        studentId: st.studentId,
        status: 'PRESENT' as AttendanceStatus,
        checkInTime: st.attendance?.checkInTime || nowIso,
      }));

      await attendanceService.batchRecordAttendance({
        classId: selectedClassId,
        date: selectedDate,
        records,
      });

      await loadRoster(selectedClassId, selectedDate);
      await loadTimelineData(selectedDate);
    } catch (err: any) {
      alert(err.response?.data?.message || '일괄 출결 처리 중 오류가 발생했습니다.');
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Open Detail / Makeup Modal
  const handleOpenDetailModal = (student: ClassRosterStudent, targetClassId?: number) => {
    setSelectedStudentForDetail(student);
    setDetailModalClassId(targetClassId || selectedClassId);
    const att = student.attendance;

    const formatTimeForInput = (iso?: string | null) => {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        return d.toTimeString().slice(0, 5); // HH:mm
      } catch {
        return '';
      }
    };

    setDetailFormData({
      status: att?.status || 'PRESENT',
      checkInTime: formatTimeForInput(att?.checkInTime),
      checkOutTime: formatTimeForInput(att?.checkOutTime),
      reason: att?.reason || '',
      isMakeupNeeded: att?.isMakeupNeeded || false,
      isMakeupCompleted: att?.isMakeupCompleted || false,
      memo: att?.memo || '',
    });
    setIsDetailModalOpen(true);
  };

  // Save Detail Modal
  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveClassId = detailModalClassId || selectedClassId;
    if (!effectiveClassId || !selectedStudentForDetail) return;

    setIsSavingDetail(true);

    const makeIsoTime = (timeStr: string) => {
      if (!timeStr) return undefined;
      return `${selectedDate}T${timeStr}:00.000Z`;
    };

    try {
      await attendanceService.recordAttendance({
        studentId: selectedStudentForDetail.studentId,
        classId: effectiveClassId,
        date: selectedDate,
        status: detailFormData.status,
        checkInTime: makeIsoTime(detailFormData.checkInTime),
        checkOutTime: makeIsoTime(detailFormData.checkOutTime),
        reason: detailFormData.reason.trim() || undefined,
        isMakeupNeeded: detailFormData.isMakeupNeeded,
        isMakeupCompleted: detailFormData.isMakeupCompleted,
        memo: detailFormData.memo.trim() || undefined,
      });

      setIsDetailModalOpen(false);
      if (displayMode === 'TIMELINE') {
        await loadTimelineData(selectedDate);
      }
      if (selectedClassId) {
        await loadRoster(selectedClassId, selectedDate);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '출결 정보 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingDetail(false);
    }
  };

  // Toggle Makeup Status directly from card
  const handleToggleMakeupCompleted = async (att: AttendanceItem) => {
    try {
      await attendanceService.updateMakeup(att.id, {
        isMakeupNeeded: true,
        isMakeupCompleted: !att.isMakeupCompleted,
      });
      if (displayMode === 'TIMELINE') {
        await loadTimelineData(selectedDate);
      }
      if (selectedClassId) {
        await loadRoster(selectedClassId, selectedDate);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '보강 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // Open Stats Modal
  const handleOpenStatsModal = async () => {
    setIsStatsModalOpen(true);
    setIsLoadingStats(true);
    try {
      const data = await attendanceService.getStats({
        classId: displayMode === 'CLASS' ? selectedClassId || undefined : undefined,
      });
      setStatsData(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Role Badge calculation
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          label: '플랫폼 관리자',
          color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'OWNER':
        return {
          label: '원장님 (OWNER)',
          color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'ADMIN':
        return {
          label: '실장/관리자 (ADMIN)',
          color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'TEACHER':
        return {
          label: '담당 강사 (TEACHER)',
          color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'STAFF':
        return {
          label: '조교/직원 (STAFF)',
          color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      default:
        return {
          label: role,
          color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
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

  const formatDisplayTime = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '-';
    }
  };

  // Filter student helper
  const matchesFilter = (st: ClassRosterStudent) => {
    const matchesSearch =
      !searchTerm.trim() ||
      st.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (st.grade && st.grade.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (st.studentPhone && st.studentPhone.includes(searchTerm)) ||
      st.parentPhone.includes(searchTerm);

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'UNMARKED') return !st.attendance;
    return st.attendance?.status === statusFilter;
  };

  // Filter students for CLASS mode
  const filteredClassStudents = (roster?.students || []).filter(matchesFilter);

  // Overall totals across all active classes for the day (for KPI cards in TIMELINE mode)
  const timelineOverallTotals = useMemo(() => {
    let total = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let earlyLeave = 0;
    let unmarked = 0;

    for (const r of timelineRosters) {
      total += r.totalStudents;
      present += r.presentCount;
      absent += r.absentCount;
      late += r.lateCount;
      earlyLeave += r.earlyLeaveCount;
      unmarked += r.unmarkedCount;
    }

    const rate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

    return { total, present, absent, late, earlyLeave, unmarked, rate };
  }, [timelineRosters]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const displayTotals =
    displayMode === 'TIMELINE'
      ? {
          total: timelineOverallTotals.total,
          present: timelineOverallTotals.present,
          absent: timelineOverallTotals.absent,
          late: timelineOverallTotals.late,
          earlyLeave: timelineOverallTotals.earlyLeave,
          unmarked: timelineOverallTotals.unmarked,
          rate: timelineOverallTotals.rate,
        }
      : {
          total: roster?.totalStudents || 0,
          present: roster?.presentCount || 0,
          absent: roster?.absentCount || 0,
          late: roster?.lateCount || 0,
          earlyLeave: roster?.earlyLeaveCount || 0,
          unmarked: roster?.unmarkedCount || 0,
          rate:
            roster && roster.totalStudents > 0
              ? Number(((roster.presentCount / roster.totalStudents) * 100).toFixed(1))
              : 0,
        };

  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  const roleBadge = getRoleBadge(user.role);

  // Render a Single Student in Large List View
  const renderStudentLargeListItem = (
    student: ClassRosterStudent,
    classId: number,
    className?: string,
    schedule?: string | null,
  ) => {
    const att = student.attendance;
    const currentStatus = att?.status;
    const isActionLoading = actionLoadingStudentId === student.studentId;

    return (
      <div
        key={`${student.studentId}_${classId}`}
        className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          currentStatus === 'PRESENT'
            ? 'border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/10'
            : currentStatus === 'ABSENT'
            ? 'border-rose-300/80 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/10'
            : currentStatus === 'LATE'
            ? 'border-amber-300/80 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
            : currentStatus === 'EARLY_LEAVE'
            ? 'border-purple-300/80 dark:border-purple-800/80 bg-purple-50/20 dark:bg-purple-950/10'
            : 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800'
        }`}
      >
        {/* Left: Avatar & Info */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-[280px]">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-extrabold text-base shrink-0 shadow-2xs">
            {student.studentName.slice(0, 1)}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {student.studentName}
              </h3>
              {student.grade && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                  {student.grade}
                </span>
              )}
              {className && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-800">
                  {className}
                </span>
              )}
              {schedule && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {schedule}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1 font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                학부모: {student.parentPhone}
                {student.parentName && ` (${student.parentName})`}
              </span>
              {student.studentPhone && (
                <span className="hidden sm:inline-block text-slate-400">
                  • 원생: {student.studentPhone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Status Badge, Timestamps & Notes */}
        <div className="flex items-center gap-3 flex-wrap lg:justify-center">
          {/* Status Badge */}
          {currentStatus === 'PRESENT' && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>출석 완료</span>
            </span>
          )}
          {currentStatus === 'ABSENT' && (
            <span className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>결석</span>
            </span>
          )}
          {currentStatus === 'LATE' && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>지각</span>
            </span>
          )}
          {currentStatus === 'EARLY_LEAVE' && (
            <span className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <DoorOpen className="w-4 h-4 text-purple-600" />
              <span>조퇴</span>
            </span>
          )}
          {!currentStatus && (
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium">
              미체크
            </span>
          )}

          {/* Timestamps */}
          <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              등원: <strong className="text-slate-900 dark:text-white font-bold ml-0.5">{formatDisplayTime(att?.checkInTime)}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-blue-500" />
              하원: <strong className="text-slate-900 dark:text-white font-bold ml-0.5">{formatDisplayTime(att?.checkOutTime)}</strong>
            </span>
          </div>

          {/* Makeup Badge / Action */}
          {att?.isMakeupNeeded && (
            <button
              type="button"
              onClick={() => handleToggleMakeupCompleted(att)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                att.isMakeupCompleted
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 hover:bg-amber-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{att.isMakeupCompleted ? '보강 완료' : '보강 필요'}</span>
            </button>
          )}

          {att?.reason && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg truncate max-w-[140px]" title={att.reason}>
              사유: {att.reason}
            </span>
          )}
        </div>

        {/* Right: Touch-Friendly 1-Second Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1. 출석 */}
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => handleQuickStatusChange(student.studentId, 'PRESENT', classId)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentStatus === 'PRESENT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>출석</span>
          </button>

          {/* 2. 지각 */}
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => handleQuickStatusChange(student.studentId, 'LATE', classId)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentStatus === 'LATE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>지각</span>
          </button>

          {/* 3. 결석 */}
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => handleQuickStatusChange(student.studentId, 'ABSENT', classId)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentStatus === 'ABSENT'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>결석</span>
          </button>

          {/* 4. 조퇴 */}
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => handleQuickStatusChange(student.studentId, 'EARLY_LEAVE', classId)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentStatus === 'EARLY_LEAVE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/50'
            }`}
          >
            <DoorOpen className="w-4 h-4" />
            <span>조퇴</span>
          </button>

          {/* 5. 하원 */}
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => handleQuickCheckOut(student.studentId, classId)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              att?.checkOutTime
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>하원</span>
          </button>

          {/* 6. 상세 수정 */}
          <button
            type="button"
            onClick={() => handleOpenDetailModal(student, classId)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            title="상세 메모 및 사유 수정"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Render a Single Student in Card Grid View
  const renderStudentCardItem = (
    student: ClassRosterStudent,
    classId: number,
    className?: string,
    schedule?: string | null,
  ) => {
    const att = student.attendance;
    const currentStatus = att?.status;
    const isActionLoading = actionLoadingStudentId === student.studentId;

    return (
      <div
        key={`${student.studentId}_${classId}`}
        className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-200 shadow-xs flex flex-col justify-between space-y-4 ${
          currentStatus === 'PRESENT'
            ? 'border-emerald-300/80 dark:border-emerald-800/80 hover:border-emerald-400'
            : currentStatus === 'ABSENT'
            ? 'border-rose-300/80 dark:border-rose-800/80 hover:border-rose-400'
            : currentStatus === 'LATE'
            ? 'border-amber-300/80 dark:border-amber-800/80 hover:border-amber-400'
            : currentStatus === 'EARLY_LEAVE'
            ? 'border-purple-300/80 dark:border-purple-800/80 hover:border-purple-400'
            : 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800'
        }`}
      >
        {/* Top Row: Student Profile & Current Status Pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
              {student.studentName.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {student.studentName}
                </h3>
                {student.grade && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                    {student.grade}
                  </span>
                )}
                {className && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-medium">
                    {className}
                  </span>
                )}
                {schedule && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {schedule}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {student.parentPhone}
                  {student.parentName && ` (${student.parentName})`}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge & Detail Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {currentStatus === 'PRESENT' && (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>출석</span>
              </span>
            )}
            {currentStatus === 'ABSENT' && (
              <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>결석</span>
              </span>
            )}
            {currentStatus === 'LATE' && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>지각</span>
              </span>
            )}
            {currentStatus === 'EARLY_LEAVE' && (
              <span className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1">
                <DoorOpen className="w-3.5 h-3.5 text-purple-600" />
                <span>조퇴</span>
              </span>
            )}
            {!currentStatus && (
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium">
                미체크
              </span>
            )}

            <button
              type="button"
              onClick={() => handleOpenDetailModal(student, classId)}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              title="상세 사유 및 보강 메모 수정"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Middle: Timestamps & Notes */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3 text-indigo-500" />
              등원 시각:
              <strong className="text-slate-800 dark:text-slate-200 ml-1">
                {formatDisplayTime(att?.checkInTime)}
              </strong>
            </span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <DoorOpen className="w-3 h-3 text-indigo-500" />
              하원 시각:
              <strong className="text-slate-800 dark:text-slate-200 ml-1">
                {formatDisplayTime(att?.checkOutTime)}
              </strong>
            </span>
          </div>

          {att?.reason && (
            <div className="text-slate-600 dark:text-slate-300 font-medium">
              <span className="text-slate-400 mr-1">사유:</span>
              {att.reason}
            </div>
          )}

          {att?.isMakeupNeeded && (
            <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Bookmark className="w-3 h-3" />
                보강 수업 대상자
              </span>
              <button
                type="button"
                onClick={() => handleToggleMakeupCompleted(att)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  att.isMakeupCompleted
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-200'
                }`}
              >
                {att.isMakeupCompleted ? '✓ 보강 완료' : '미완료 (클릭 시 완료)'}
              </button>
            </div>
          )}
        </div>

        {/* Bottom: 1-Second Touch Action Buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          {/* 1. 출석 */}
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => handleQuickStatusChange(student.studentId, 'PRESENT', classId)}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              currentStatus === 'PRESENT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>출석</span>
          </button>

          {/* 2. 지각 */}
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => handleQuickStatusChange(student.studentId, 'LATE', classId)}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              currentStatus === 'LATE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>지각</span>
          </button>

          {/* 3. 결석 */}
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => handleQuickStatusChange(student.studentId, 'ABSENT', classId)}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              currentStatus === 'ABSENT'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>결석</span>
          </button>

          {/* 4. 조퇴 */}
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => handleQuickStatusChange(student.studentId, 'EARLY_LEAVE', classId)}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              currentStatus === 'EARLY_LEAVE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/50'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>조퇴</span>
          </button>

          {/* 5. 하원 체크 */}
          <button
            type="button"
            disabled={isActionLoading}
            onClick={() => handleQuickCheckOut(student.studentId, classId)}
            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              att?.checkOutTime
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>하원</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Class<span className="text-indigo-600 dark:text-indigo-400">Helper</span>
              </span>
            </Link>

            {academy && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{academy.name}</span>
              </div>
            )}

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-2">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                대시보드
              </Link>
              <Link
                href="/students"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                원생 관리
              </Link>
              <Link
                href="/classes"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                반 & 수강생 관리
              </Link>
              <Link
                href="/attendance"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 transition-colors"
              >
                1초 출결 체크
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            {user.role === 'SUPER_ADMIN' && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs shadow-purple-600/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>관리자 포털로 돌아가기</span>
              </Link>
            )}

            {/* Header Notification Bell */}
            <NotificationBell />

            <ThemeToggle />

            <div className="hidden md:flex flex-col items-end mr-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</span>
            </div>

            <span
              className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${roleBadge.color}`}
            >
              {roleBadge.label}
            </span>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Section */}
      <main className="flex-1 relative overflow-hidden py-8">
        <div className="absolute inset-0 bg-dot-vignette pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-7">
          {/* Header Title & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
                <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Phase 3-4: 1-Second Attendance & Notification</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                1초 출결 체크 및 현황 관리
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                시간대별 등원 예정 학생을 실시간으로 확인하고, 터치 한 번으로 출결(출석, 결석, 지각, 조퇴, 하원)을 기록하세요.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleOpenStatsModal}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>출결 통계</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (displayMode === 'TIMELINE') {
                    loadTimelineData(selectedDate);
                  } else if (selectedClassId) {
                    loadRoster(selectedClassId, selectedDate);
                  }
                  loadUnattendedStatus(selectedDate);
                }}
                disabled={isLoadingRoster || isLoadingTimeline}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
                title="새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingRoster || isLoadingTimeline ? 'animate-spin' : ''}`} />
              </button>

              {displayMode === 'CLASS' && (
                <button
                  type="button"
                  onClick={handleBatchAllPresent}
                  disabled={isBatchLoading || !roster || roster.students.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBatchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4" />
                  )}
                  <span>전원 출석 일괄 처리</span>
                </button>
              )}
            </div>
          </div>

          {/* Urgent Unattended Alert Banner (수업 시간 미등원 학생 감지 배너) */}
          {unattendedStatus.isUnattendedAlertActive && (
            <div className="p-4 sm:p-5 rounded-3xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-bounce">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                        수업 미등원 학생 감지 경고
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                        {unattendedStatus.unattendedCount}명 미등원
                      </span>
                    </div>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                      오늘 수업 시작 시간이 지났으나 아직 출결 체크가 되지 않은 학생이 있습니다. 출결을 완료하시면 경고 신호가 자동으로 해제됩니다.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerUnattendedKakao}
                  disabled={isTriggeringKakao}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isTriggeringKakao ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5" />
                  )}
                  <span>카카오 안심 알림톡 일괄 발송</span>
                </button>
              </div>

              {/* Unattended Students Chips */}
              <div className="mt-3.5 pt-3 border-t border-rose-200/80 dark:border-rose-800/60 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                  미등원 원생 목록:
                </span>
                {unattendedStatus.unattendedStudents.map((st) => (
                  <div
                    key={`${st.studentId}_${st.classId}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-800 dark:text-rose-200 shadow-2xs"
                  >
                    <span>{st.studentName}</span>
                    <span className="text-[10px] font-normal text-rose-600 dark:text-rose-400">
                      ({st.className})
                    </span>
                    {st.isAlertSent && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold">
                        알림발송됨
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs: Timeline View vs Class View */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800/70 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setDisplayMode('TIMELINE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                displayMode === 'TIMELINE'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>⏰ 시간대별 등원 예정 (오늘 전체)</span>
              {timeSlotGroups.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold">
                  {timeSlotGroups.length}개 시간대
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDisplayMode('CLASS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                displayMode === 'CLASS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>🏫 반별 출결 체크</span>
            </button>
          </div>

          {/* Selection & Control Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
              {/* 1. Class Selection Dropdown (Only in CLASS mode) */}
              {displayMode === 'CLASS' ? (
                <div className="md:col-span-5 relative" ref={classDropdownRef}>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    수업 반 선택
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
                          {selectedClass.name}{' '}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                            ({selectedClass.schedule || '시간표 미정'})
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">개설된 반을 선택해주세요</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isClassDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 max-h-64 overflow-y-auto space-y-1">
                      {classes.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          개설된 활성 반이 없습니다.
                        </div>
                      ) : (
                        classes.map((cls) => (
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
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getSubjectColor(cls.subject)}`}>
                                {cls.subject || '공통'}
                              </span>
                              <span className="truncate">{cls.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 shrink-0">
                              {cls.enrolledCount}명 수강
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="md:col-span-5 flex items-center gap-3 p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                      오늘 등원 예정 전체 학생 보기 모드
                    </h4>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                      시간표에 따라 지금 와야 하는 학생을 한눈에 파악하고 출결을 체크합니다.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Date Navigation & Picker */}
              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  출결 기준 일자
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleShiftDate(-1)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    title="전날"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex-1">
                    <CustomDatePicker
                      value={selectedDate}
                      onChange={(newDate) => setSelectedDate(newDate)}
                      placeholder="YYYY-MM-DD"
                      className="w-full"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleShiftDate(1)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    title="다음날"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSetToday}
                    className="px-2.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all cursor-pointer shrink-0"
                  >
                    오늘
                  </button>
                </div>
              </div>

              {/* 3. Search Bar */}
              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  원생 검색
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="이름, 학년, 전화번호..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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

            {/* Bottom Row: Status Filter Tabs */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
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
                  전체 ({displayTotals.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('PRESENT')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'PRESENT'
                      ? 'bg-emerald-500 text-white shadow-2xs font-bold'
                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  출석 ({displayTotals.present})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ABSENT')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'ABSENT'
                      ? 'bg-rose-500 text-white shadow-2xs font-bold'
                      : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  결석 ({displayTotals.absent})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('LATE')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'LATE'
                      ? 'bg-amber-500 text-white shadow-2xs font-bold'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  지각 ({displayTotals.late})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('EARLY_LEAVE')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'EARLY_LEAVE'
                      ? 'bg-purple-500 text-white shadow-2xs font-bold'
                      : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                  }`}
                >
                  조퇴 ({displayTotals.earlyLeave})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('UNMARKED')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'UNMARKED'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  미체크 ({displayTotals.unmarked})
                </button>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                기준 일자: <strong className="text-slate-800 dark:text-slate-200">{selectedDate}</strong>
              </div>
            </div>
          </div>

          {/* KPI Stat Cards (4 Columns) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Enrolled */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {displayMode === 'TIMELINE' ? '오늘 전체 등원 대상' : '반 총 수강 인원'}
                </p>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {displayTotals.total}
                  <span className="text-xs font-normal text-slate-400 ml-1">명</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* 2. Attendance Rate */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">당일 출석률</p>
                <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {displayTotals.rate}%
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* 3. Present Count */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">출석 완료</p>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {displayTotals.present}
                  <span className="text-xs font-normal text-slate-400 ml-1">명</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* 4. Absent & Late */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">결석 / 지각</p>
                <p className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                  {displayTotals.absent}
                  <span className="text-xs font-normal text-slate-400 mx-1">/</span>
                  <span className="text-amber-500">{displayTotals.late}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Main Attendance Roster Board */}
          <div className="space-y-6">
            {/* Header with Title & Size / View Options on the Right */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>
                    {displayMode === 'TIMELINE' ? '시간대별 등원 예정 현황판' : '수강생 출결 체크보드'}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {displayMode === 'TIMELINE'
                      ? `${timeSlotGroups.reduce((acc, g) => acc + g.students.filter(matchesFilter).length, 0)}명`
                      : `${filteredClassStudents.length}명`}
                  </span>
                </h2>
              </div>

              {/* View Layout & Size Controls on the Right Side */}
              <div className="flex items-center gap-2 flex-wrap">
                {displayMode === 'TIMELINE' && timeSlotGroups.length > 0 && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={handleExpandAllSlots}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
                    >
                      모두 펼치기
                    </button>
                    <button
                      type="button"
                      onClick={handleCollapseAllSlots}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
                    >
                      모두 접기
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setViewLayout('LARGE_LIST')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewLayout === 'LARGE_LIST'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="큰 리스트 형태 (터치 친화적 대형 행 뷰)"
                  >
                    <Rows3 className="w-3.5 h-3.5" />
                    <span>큰 리스트</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewLayout('CARD')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewLayout === 'CARD'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="카드 그리드 뷰 (2열 컴팩트 카드)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>카드 뷰</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Display Mode 1: TIMELINE (시간대별 등원 예정 학생 타임라인) */}
            {displayMode === 'TIMELINE' && (
              <>
                {isLoadingTimeline ? (
                  <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      오늘 시간대별 등원 예정 원생 데이터를 불러오는 중입니다...
                    </p>
                  </div>
                ) : timeSlotGroups.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
                    <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      선택한 날짜에 예정된 수업이 없습니다
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      반 관리에서 활성 반 및 시간표를 등록해주세요.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timeSlotGroups.map((group) => {
                      const filteredInGroup = group.students.filter(matchesFilter);
                      if (filteredInGroup.length === 0 && (searchTerm || statusFilter !== 'ALL')) {
                        return null;
                      }

                      const isCurrentActive = group.status === 'CURRENT';
                      const isCollapsed = Boolean(collapsedSlots[group.timeSlot]);

                      return (
                        <div
                          key={group.timeSlot}
                          className={`rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs ${
                            isCurrentActive
                              ? 'border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-950/10'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {/* Time Slot Header Banner (Click to Accordion Expand / Collapse) */}
                          <div
                            onClick={() => toggleTimeSlotCollapse(group.timeSlot)}
                            className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer select-none transition-colors ${
                              !isCollapsed ? 'border-b' : ''
                            } ${
                              isCurrentActive
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/60'
                                : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              {/* Chevron Arrow Indicator */}
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                                  isCollapsed
                                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                    : 'bg-indigo-100 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                                }`}
                              >
                                <ChevronDown
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    isCollapsed ? '-rotate-90 text-slate-400' : 'rotate-0'
                                  }`}
                                />
                              </div>

                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                  isCurrentActive
                                    ? 'bg-indigo-600 text-white shadow-xs animate-pulse'
                                    : group.status === 'PAST'
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                <Clock className="w-5 h-5" />
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                    {group.timeSlot}
                                  </h3>

                                  {isCurrentActive && (
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold flex items-center gap-1 shadow-2xs">
                                      <Sparkles className="w-3 h-3" />
                                      <span>현재 진행 중인 수업</span>
                                    </span>
                                  )}
                                  {group.status === 'UPCOMING' && (
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                                      등원 예정
                                    </span>
                                  )}
                                  {group.status === 'PAST' && (
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                                      수업 진행됨
                                    </span>
                                  )}

                                  {isCollapsed && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                                      접힘 (클릭 시 펼치기)
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                  <span>
                                    해당 반: {group.classes.map((c) => c.className).join(', ')}
                                  </span>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    총 {group.totalStudents}명 (출석 {group.presentCount}명, 미등원 {group.unattendedCount}명)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Batch check for this time slot (Click event stopped from collapsing) */}
                            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBatchPresentForTimeSlot(group);
                                }}
                                disabled={isBatchLoading || group.students.length === 0}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>해당 시간 전원 출석</span>
                              </button>
                            </div>
                          </div>

                          {/* Students List in Time Slot (Rendered only when expanded) */}
                          {!isCollapsed && (
                            <div className="p-4 sm:p-5 animate-in fade-in duration-150">
                              {filteredInGroup.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-400">
                                  검색 조건에 맞는 원생이 없습니다.
                                </div>
                              ) : viewLayout === 'LARGE_LIST' ? (
                                <div className="space-y-3">
                                  {filteredInGroup.map((st) =>
                                    renderStudentLargeListItem(
                                      st,
                                      st.classId,
                                      st.className,
                                      st.schedule,
                                    ),
                                  )}
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {filteredInGroup.map((st) =>
                                    renderStudentCardItem(
                                      st,
                                      st.classId,
                                      st.className,
                                      st.schedule,
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Display Mode 2: CLASS (개별 반별 출결 체크) */}
            {displayMode === 'CLASS' && (
              <>
                {isLoadingRoster ? (
                  <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      출결 명단을 불러오는 중입니다...
                    </p>
                  </div>
                ) : !selectedClassId ? (
                  <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
                    <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">수업 반을 선택해주세요</h3>
                    <p className="text-xs text-slate-500 mt-1">상단에서 출결을 관리할 수업 반을 선택하세요.</p>
                  </div>
                ) : filteredClassStudents.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
                    <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">해당 조건의 원생이 없습니다</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      검색어 또는 필터를 변경하거나 반에 수강생을 먼저 배정해주세요.
                    </p>
                  </div>
                ) : viewLayout === 'LARGE_LIST' ? (
                  <div className="space-y-3">
                    {filteredClassStudents.map((st) =>
                      renderStudentLargeListItem(
                        st,
                        selectedClassId,
                        roster?.class.name,
                        roster?.class.schedule,
                      ),
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredClassStudents.map((st) =>
                      renderStudentCardItem(
                        st,
                        selectedClassId,
                        roster?.class.name,
                        roster?.class.schedule,
                      ),
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* 1. Detail & Makeup Modal */}
      {isDetailModalOpen && selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  [{selectedStudentForDetail.studentName}] 출결 상세 수정
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  출결 상태, 등/하원 시각, 결석 사유 및 보강 필요 여부를 설정합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDetail} className="space-y-4">
              {/* Status Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  출결 상태
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 'PRESENT', label: '출석', color: 'emerald' },
                    { val: 'ABSENT', label: '결석', color: 'rose' },
                    { val: 'LATE', label: '지각', color: 'amber' },
                    { val: 'EARLY_LEAVE', label: '조퇴', color: 'purple' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() =>
                        setDetailFormData((prev) => ({
                          ...prev,
                          status: item.val as AttendanceStatus,
                          isMakeupNeeded: item.val === 'ABSENT' ? true : prev.isMakeupNeeded,
                        }))
                      }
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        detailFormData.status === item.val
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    등원 시각 (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={detailFormData.checkInTime}
                    onChange={(e) =>
                      setDetailFormData((prev) => ({ ...prev, checkInTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    하원 시각 (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={detailFormData.checkOutTime}
                    onChange={(e) =>
                      setDetailFormData((prev) => ({ ...prev, checkOutTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  지각 / 결석 / 조퇴 사유
                </label>
                <input
                  type="text"
                  placeholder="예: 감기 몸살로 인한 결석, 병원 진료 후 늦게 등원"
                  value={detailFormData.reason}
                  onChange={(e) =>
                    setDetailFormData((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>

              {/* Makeup Checkbox Options */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detailFormData.isMakeupNeeded}
                    onChange={(e) =>
                      setDetailFormData((prev) => ({
                        ...prev,
                        isMakeupNeeded: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>보강 수업이 필요한 학생입니다 (Makeup 대상)</span>
                </label>

                {detailFormData.isMakeupNeeded && (
                  <label className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 pl-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={detailFormData.isMakeupCompleted}
                      onChange={(e) =>
                        setDetailFormData((prev) => ({
                          ...prev,
                          isMakeupCompleted: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>보강 수업 완료 처리됨</span>
                  </label>
                )}
              </div>

              {/* Memo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  특이사항 메모
                </label>
                <textarea
                  rows={2}
                  placeholder="선생님 참고용 출결 메모..."
                  value={detailFormData.memo}
                  onChange={(e) =>
                    setDetailFormData((prev) => ({ ...prev, memo: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSavingDetail}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingDetail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>저장하기</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Stats Analysis Modal */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>출결 통계 및 추이 분석</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedClass ? selectedClass.name : '학원 전체'} 기간별 출석 집계 데이터
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingStats ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs text-slate-500">통계 데이터를 계산하고 있습니다...</p>
              </div>
            ) : statsData ? (
              <div className="space-y-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/80 text-center">
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">평균 출석률</span>
                    <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {statsData.averageAttendanceRate}%
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[11px] font-bold text-slate-500">총 기록 건수</span>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {statsData.totalRecords}건
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/80 text-center">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">보강 필요/완료</span>
                    <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                      {statsData.makeupNeededCount} / {statsData.makeupCompletedCount}
                    </p>
                  </div>
                </div>

                {/* Daily Trend List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                    일자별 출석 현황 추이
                  </h4>
                  {statsData.dailyStats.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">기간 내 출결 데이터가 없습니다.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {statsData.dailyStats.map((stat) => (
                        <div
                          key={stat.date}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">{stat.date}</span>
                          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              출석 {stat.present}
                            </span>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              결석 {stat.absent}
                            </span>
                            <span className="text-amber-500 font-semibold">
                              지각 {stat.late}
                            </span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {stat.attendanceRate}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsStatsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
