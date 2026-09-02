'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Edit3,
  FileText,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Phone,
  X,
  Receipt,
  Sparkles,
  Ban,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  tuitionService,
  InvoiceItem,
  InvoiceStatus,
  PaymentMethod,
  RevenueStatsResponse,
} from '@/lib/tuition-service';
import { classesService, ClassItem } from '@/lib/classes-service';
import { CustomDropdown } from '@/components/CustomDropdown';
import { AppLayout } from '@/components/common/AppLayout';
import { CustomDatePicker } from '@/components/CustomDatePicker';

export default function TuitionPage() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  // Current selected Year-Month (e.g. "2026-09")
  const [currentYearMonth, setCurrentYearMonth] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Data States
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [stats, setStats] = useState<RevenueStatsResponse | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Modal 1: Generate Monthly Invoices
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateYearMonth, setGenerateYearMonth] = useState(currentYearMonth);
  const [generateDueDate, setGenerateDueDate] = useState(`${currentYearMonth}-10`);
  const [generateClassId, setGenerateClassId] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Modal 2: Record Payment (수납 처리)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceItem | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentReceiptNumber, setPaymentReceiptNumber] = useState('');
  const [paymentMemo, setPaymentMemo] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Modal 3: Edit / Discount Invoice
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<InvoiceItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDiscountAmount, setEditDiscountAmount] = useState<number>(0);
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal 4: Payment History & Receipt
  const [selectedInvoiceForHistory, setSelectedInvoiceForHistory] = useState<InvoiceItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // ESC to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsGenerateModalOpen(false);
        setIsPaymentModalOpen(false);
        setIsEditModalOpen(false);
        setIsHistoryModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load Classes for filter / batch generation
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      classesService
        .getClasses()
        .then((res) => setClasses(res.items || []))
        .catch(() => {});
    }
  }, [isHydrated, isAuthenticated]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load Invoices and Revenue Stats whenever filters change
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      loadTuitionData();
    }
  }, [isHydrated, isAuthenticated, currentYearMonth, statusFilter, debouncedSearch, currentPage]);

  const loadTuitionData = async () => {
    setIsLoading(true);
    try {
      // 1. Load Revenue Stats
      tuitionService.getRevenueStats(currentYearMonth).then(setStats).catch(() => setStats(null));

      // 2. Load Invoices List
      const res = await tuitionService.getInvoices({
        billingYearMonth: currentYearMonth,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: debouncedSearch.trim() || undefined,
        page: currentPage,
        limit: 15,
      });

      setInvoices(res.items);
      setTotalCount(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      console.error('Failed to load tuition data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = currentYearMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, '0');
    setCurrentYearMonth(`${newY}-${newM}`);
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    const [y, m] = currentYearMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, '0');
    setCurrentYearMonth(`${newY}-${newM}`);
    setCurrentPage(1);
  };

  const handleCurrentMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setCurrentYearMonth(`${y}-${m}`);
    setCurrentPage(1);
  };

  // 1. Generate Invoices
  const handleOpenGenerateModal = () => {
    setGenerateYearMonth(currentYearMonth);
    setGenerateDueDate(`${currentYearMonth}-10`);
    setGenerateClassId('ALL');
    setGenerateError(null);
    setIsGenerateModalOpen(true);
  };

  const handleGenerateInvoicesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const result = await tuitionService.generateInvoices({
        billingYearMonth: generateYearMonth,
        dueDate: generateDueDate,
        classId: generateClassId === 'ALL' ? undefined : Number(generateClassId),
      });

      alert(
        `🎉 ${generateYearMonth} 수강료 청구서 자동 생성이 완료되었습니다!\n\n` +
          `• 신규 발행된 청구서: ${result.createdCount}건\n` +
          `• 중복 방지로 건너뜀: ${result.skippedCount}건\n` +
          `• 총 청구 금액: ${result.totalInvoicedAmount.toLocaleString()}원`,
      );

      setIsGenerateModalOpen(false);
      setCurrentYearMonth(generateYearMonth);
      loadTuitionData();
    } catch (err: any) {
      setGenerateError(err.response?.data?.message || '청구서 일괄 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Record Payment Modal
  const handleOpenPaymentModal = (invoice: InvoiceItem) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentAmount(invoice.remainingAmount);
    setPaymentMethod('CARD');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentReceiptNumber('');
    setPaymentMemo('');
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    if (paymentAmount <= 0) {
      setPaymentError('수납 금액은 0원보다 커야 합니다.');
      return;
    }

    if (paymentAmount > selectedInvoiceForPayment.remainingAmount) {
      setPaymentError(
        `수납 금액이 잔여 미납액(${selectedInvoiceForPayment.remainingAmount.toLocaleString()}원)을 초과할 수 없습니다.`,
      );
      return;
    }

    setIsRecordingPayment(true);
    setPaymentError(null);

    try {
      await tuitionService.recordPayment(selectedInvoiceForPayment.id, {
        amount: paymentAmount,
        method: paymentMethod,
        paidAt: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        receiptNumber: paymentReceiptNumber.trim() || undefined,
        memo: paymentMemo.trim() || undefined,
      });

      alert(
        `✅ ${selectedInvoiceForPayment.student?.name} 학생의 수강료 ${paymentAmount.toLocaleString()}원 수납 처리가 완료되었습니다!`,
      );

      setIsPaymentModalOpen(false);
      loadTuitionData();
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || '수납 등록 중 오류가 발생했습니다.');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // 3. Edit / Discount Modal
  const handleOpenEditModal = (invoice: InvoiceItem) => {
    setSelectedInvoiceForEdit(invoice);
    setEditDiscountAmount(invoice.discountAmount || 0);
    setEditDueDate(invoice.dueDate ? invoice.dueDate.split('T')[0] : '');
    setEditDescription(invoice.description || '');
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForEdit) return;

    if (editDiscountAmount > selectedInvoiceForEdit.originalAmount) {
      setEditError(
        `할인 금액이 원금(${selectedInvoiceForEdit.originalAmount.toLocaleString()}원)을 초과할 수 없습니다.`,
      );
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);

    try {
      await tuitionService.updateInvoice(selectedInvoiceForEdit.id, {
        discountAmount: editDiscountAmount,
        dueDate: editDueDate || undefined,
        description: editDescription.trim() || undefined,
      });

      alert('✅ 청구서 할인 및 상세 정보가 성공적으로 수정되었습니다.');
      setIsEditModalOpen(false);
      loadTuitionData();
    } catch (err: any) {
      setEditError(err.response?.data?.message || '청구서 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // 4. Void (Cancel) Invoice
  const handleVoidInvoice = async (invoice: InvoiceItem) => {
    if (invoice.paidAmount > 0) {
      alert('이미 결제/수납된 금액이 있는 청구서는 취소할 수 없습니다.');
      return;
    }

    if (
      !confirm(
        `정말로 ${invoice.student?.name} 학생의 ${invoice.billingYearMonth} 청구서(${invoice.finalAmount.toLocaleString()}원)를 취소(VOID)하시겠습니까?`,
      )
    ) {
      return;
    }

    setActionLoadingId(invoice.id);
    try {
      await tuitionService.voidInvoice(invoice.id);
      alert('✅ 청구서가 취소(VOID) 처리되었습니다.');
      loadTuitionData();
    } catch (err: any) {
      alert(err.response?.data?.message || '청구서 취소 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. Send Kakao Payment Reminder
  const handleSendReminder = async (invoice: InvoiceItem) => {
    if (!confirm(`${invoice.student?.name} 학생 학부모님께 수강료 납부 안내 카카오 알림톡을 발송하시겠습니까?`)) {
      return;
    }

    setActionLoadingId(invoice.id);
    try {
      const res = await tuitionService.sendPaymentReminder(invoice.id);
      alert(`📱 ${res.message || '학부모님께 카카오 알림톡이 성공적으로 발송되었습니다.'}`);
    } catch (err: any) {
      alert(err.response?.data?.message || '알림톡 발송 중 오류가 발생했습니다.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 6. View Payment History & Receipt
  const handleOpenHistoryModal = async (invoice: InvoiceItem) => {
    try {
      const detail = await tuitionService.getInvoice(invoice.id);
      setSelectedInvoiceForHistory(detail);
      setIsHistoryModalOpen(true);
    } catch {
      setSelectedInvoiceForHistory(invoice);
      setIsHistoryModalOpen(true);
    }
  };

  // Helpers
  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>완납</span>
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>부분수납</span>
          </span>
        );
      case 'UNPAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>미납</span>
          </span>
        );
      case 'VOID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Ban className="w-3.5 h-3.5" />
            <span>취소됨</span>
          </span>
        );
    }
  };

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'CARD':
        return <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-semibold">💳 카드</span>;
      case 'CASH':
        return <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">💵 현금</span>;
      case 'BANK_TRANSFER':
        return <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-semibold">🏦 계좌이체</span>;
      case 'EASY_PAY':
        return <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold">📱 간편결제</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">기타</span>;
    }
  };

  if (!isHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-2.5">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400">수강료 관리 화면을 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  const isManager = user.role === 'SUPER_ADMIN' || user.role === 'OWNER' || user.role === 'ADMIN';
  const isOwnerOrSuper = user.role === 'SUPER_ADMIN' || user.role === 'OWNER';

  return (
    <AppLayout currentPath="/tuition">
      {/* Main Body Section */}
      <main className="flex-1 relative overflow-hidden py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-7">
          {/* Header Title & Month Switcher & Generate Action */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                수강료 청구 및 수납 관리
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                월간 수강료 청구서 일괄 자동 발행, 분할/카드/현금 수납 처리 및 미납자 카카오 알림톡을 원스톱으로 관리하세요.
              </p>
            </div>

            {/* Right: Month Selector & Batch Generate Button */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Month Navigation Capsule */}
              <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="이전 달"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white min-w-[90px] text-center">
                  {currentYearMonth.replace('-', '년 ')}월
                </span>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="다음 달"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleCurrentMonth}
                  className="ml-1 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-colors cursor-pointer"
                >
                  이번 달
                </button>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={loadTuitionData}
                disabled={isLoading}
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
                title="새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Generate Invoices Button */}
              {isManager && (
                <button
                  type="button"
                  onClick={handleOpenGenerateModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer hover:scale-102"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>청구서 일괄 자동 생성</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Major Revenue KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. 총 청구액 */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {currentYearMonth.split('-')[1]}월 총 청구액
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {(stats?.totalInvoicedAmount || 0).toLocaleString()}
                  <span className="text-sm font-medium text-slate-400 ml-1">원</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  총 {(stats?.paidCount || 0) + (stats?.unpaidCount || 0)}건 청구 (취소 제외)
                </p>
              </div>
            </div>

            {/* 2. 수납 완료액 */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  수납 완료 누적액
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {(stats?.totalCollectedAmount || 0).toLocaleString()}
                  <span className="text-sm font-medium text-slate-400 ml-1">원</span>
                </div>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-1">
                  완납 {stats?.paidCount || 0}건 수납 완료
                </p>
              </div>
            </div>

            {/* 3. 미납 잔여액 */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  미납 / 잔여 수강료
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                  {Math.max(
                    0,
                    (stats?.totalInvoicedAmount || 0) - (stats?.totalCollectedAmount || 0),
                  ).toLocaleString()}
                  <span className="text-sm font-medium text-slate-400 ml-1">원</span>
                </div>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium mt-1">
                  미납/부분수납 {stats?.unpaidCount || 0}건 대기 중
                </p>
              </div>
            </div>

            {/* 4. 수납 달성률 */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  수납 달성률
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {stats?.collectionRate !== undefined ? stats.collectionRate.toFixed(1) : '0.0'}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-indigo-600 dark:bg-indigo-400"
                    style={{ width: `${Math.min(100, stats?.collectionRate || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Search, Status Tabs & Filters Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="원생 이름, 학년, 학부모 연락처 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0 text-xs font-semibold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setCurrentPage(1);
                  }}
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
                  onClick={() => {
                    setStatusFilter('UNPAID');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'UNPAID'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                  }`}
                >
                  미납
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('PARTIALLY_PAID');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'PARTIALLY_PAID'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                  }`}
                >
                  부분수납
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('PAID');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'PAID'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                  }`}
                >
                  완납
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('VOID');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    statusFilter === 'VOID'
                      ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  취소
                </button>
              </div>
            </div>
          </div>

          {/* Invoices List Table */}
          {isLoading ? (
            <div className="py-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">수강료 청구서 목록을 불러오는 중입니다...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3.5">
                <Receipt className="w-7 h-7 stroke-1" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {currentYearMonth}월 등록된 수강료 청구서가 없습니다
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                상단의 <b>[청구서 일괄 자동 생성]</b> 버튼을 눌러 재원생들의 이번 달 수강료 청구서를 한 번에 발행하세요.
              </p>
              {isManager && (
                <button
                  type="button"
                  onClick={handleOpenGenerateModal}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>이번 달 청구서 일괄 자동 생성하기</span>
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-5">원생 정보</th>
                      <th className="py-3.5 px-4">청구 년월 / 마감일</th>
                      <th className="py-3.5 px-4 text-right">청구 금액</th>
                      <th className="py-3.5 px-4 text-right">수납 / 잔액</th>
                      <th className="py-3.5 px-4 text-center">상태</th>
                      <th className="py-3.5 px-5 text-center">수납 및 관리 액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {invoices.map((inv) => {
                      const isItemLoading = actionLoadingId === inv.id;
                      const isOverdue =
                        inv.status !== 'PAID' &&
                        inv.status !== 'VOID' &&
                        inv.dueDate &&
                        new Date(inv.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* 1. Student Info */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-xs shrink-0 border border-indigo-100 dark:border-indigo-800">
                                {inv.student?.name ? inv.student.name.slice(0, 2) : '원생'}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                                    {inv.student?.name}
                                  </span>
                                  {inv.student?.grade && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                      {inv.student.grade}
                                    </span>
                                  )}
                                </div>
                                {inv.student?.parentPhone && (
                                  <a
                                    href={`tel:${inv.student.parentPhone}`}
                                    className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mt-0.5"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>{inv.student.parentPhone}</span>
                                    {inv.student.parentName && (
                                      <span className="text-slate-400">({inv.student.parentName})</span>
                                    )}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Billing Month & Due Date */}
                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 dark:text-white text-xs">
                                {inv.billingYearMonth}
                              </span>
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-slate-400">납기:</span>
                                <span
                                  className={
                                    isOverdue
                                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                                      : 'text-slate-600 dark:text-slate-300'
                                  }
                                >
                                  {inv.dueDate ? inv.dueDate.split('T')[0] : '-'}
                                </span>
                                {isOverdue && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold">
                                    기한초과
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. Invoiced Amount & Discount */}
                          <td className="py-4 px-4 text-right">
                            <div className="space-y-0.5">
                              <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                                {inv.finalAmount.toLocaleString()}원
                              </div>
                              {inv.discountAmount > 0 && (
                                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                  할인: -{inv.discountAmount.toLocaleString()}원
                                </div>
                              )}
                              {inv.description && (
                                <p className="text-[10px] text-slate-400 truncate max-w-[140px] ml-auto">
                                  {inv.description}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* 4. Paid / Remaining Amount */}
                          <td className="py-4 px-4 text-right">
                            <div className="space-y-1">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-[11px] text-slate-400">수납:</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {inv.paidAmount.toLocaleString()}원
                                </span>
                              </div>
                              {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-[11px] text-slate-400">미납:</span>
                                  <span className="font-extrabold text-rose-600 dark:text-rose-400">
                                    {inv.remainingAmount.toLocaleString()}원
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Status Badge */}
                          <td className="py-4 px-4 text-center">
                            {getStatusBadge(inv.status)}
                          </td>

                          {/* 6. Action Buttons */}
                          <td className="py-4 px-5">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* 수납 등록 버튼 */}
                              {inv.status !== 'PAID' && inv.status !== 'VOID' && isManager && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaymentModal(inv)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer hover:scale-102"
                                  title="수납 처리"
                                >
                                  <Wallet className="w-3.5 h-3.5" />
                                  <span>수납</span>
                                </button>
                              )}

                              {/* 미납 알림톡 발송 버튼 */}
                              {(inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID') && isManager && (
                                <button
                                  type="button"
                                  onClick={() => handleSendReminder(inv)}
                                  disabled={isItemLoading}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                                  title="카카오 알림톡 납부 안내 발송"
                                >
                                  {isItemLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  <span>안내톡</span>
                                </button>
                              )}

                              {/* 수납 이력 / 영수증 조회 */}
                              <button
                                type="button"
                                onClick={() => handleOpenHistoryModal(inv)}
                                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                title="수납 이력 및 영수증"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>

                              {/* 수정 / 할인 버튼 */}
                              {inv.status !== 'VOID' && isOwnerOrSuper && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(inv)}
                                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                  title="금액 할인 및 납기 수정"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}

                              {/* 청구 취소 (VOID) 버튼 */}
                              {inv.status !== 'VOID' && inv.paidAmount === 0 && isOwnerOrSuper && (
                                <button
                                  type="button"
                                  onClick={() => handleVoidInvoice(inv)}
                                  disabled={isItemLoading}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="청구서 취소 (VOID)"
                                >
                                  <Ban className="w-4 h-4" />
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    총 {totalCount}개 중 {(currentPage - 1) * 15 + 1} -{' '}
                    {Math.min(currentPage * 15, totalCount)}개 표시
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-xl font-bold transition-colors cursor-pointer ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal 1: Generate Monthly Invoices */}
      {isGenerateModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isGenerating) {
              setIsGenerateModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  월간 수강료 청구서 일괄 자동 생성
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  재원 중인 활성 수강생들의 수강료 청구서를 생성합니다.
                </p>
              </div>
            </div>

            {generateError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{generateError}</span>
              </div>
            )}

            <form onSubmit={handleGenerateInvoicesSubmit} className="space-y-4">
              {/* Year-Month */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  청구 대상 년월 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  value={generateYearMonth}
                  onChange={(e) => {
                    setGenerateYearMonth(e.target.value);
                    setGenerateDueDate(`${e.target.value}-10`);
                  }}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  납부 마감일 <span className="text-rose-500">*</span>
                </label>
                <CustomDatePicker
                  value={generateDueDate}
                  onChange={setGenerateDueDate}
                  placeholder="납부 마감일 선택"
                  align="right"
                  className="w-full"
                />
              </div>

              {/* Target Class Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  청구 대상 반
                </label>
                <CustomDropdown
                  value={generateClassId}
                  onChange={(val) => setGenerateClassId(val)}
                  placeholder="청구 대상 반을 선택하세요"
                  fullWidth
                  searchable
                  options={[
                    { value: 'ALL', label: '전체 개설 반 (학원 전체 재원생 대상)' },
                    ...classes.map((cls) => ({
                      value: String(cls.id),
                      label: `${cls.name} (${cls.subject || '과목'})`,
                      subLabel: `월 ${(cls.monthlyFee || 0).toLocaleString()}원`,
                      count: cls.enrolledCount,
                    })),
                  ]}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * 이미 해당 월 청구서가 존재하는 원생은 자동 제외(중복 청구 방지)됩니다.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>일괄 생성 중...</span>
                    </>
                  ) : (
                    <span>청구서 일괄 발행</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Record Payment (수납 처리) */}
      {isPaymentModalOpen && selectedInvoiceForPayment && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRecordingPayment) {
              setIsPaymentModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  수강료 수납 처리
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedInvoiceForPayment.student?.name} 학생 ({selectedInvoiceForPayment.billingYearMonth})
                </p>
              </div>
            </div>

            {/* Invoice Summary Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">최종 청구 금액:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedInvoiceForPayment.finalAmount.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">기존 수납액:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {selectedInvoiceForPayment.paidAmount.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">잔여 미납 금액:</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                  {selectedInvoiceForPayment.remainingAmount.toLocaleString()}원
                </span>
              </div>
            </div>

            {paymentError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              {/* Payment Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    이번 수납 금액 <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(selectedInvoiceForPayment.remainingAmount)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    잔액 전액 입력 ({selectedInvoiceForPayment.remainingAmount.toLocaleString()}원)
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    required
                    min={1}
                    max={selectedInvoiceForPayment.remainingAmount}
                    placeholder="수납할 금액 입력"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    원
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  결제 수단 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                  {[
                    { id: 'CARD', label: '💳 카드' },
                    { id: 'CASH', label: '💵 현금' },
                    { id: 'BANK_TRANSFER', label: '🏦 계좌이체' },
                    { id: 'EASY_PAY', label: '📱 간편결제' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  결제 일자
                </label>
                <CustomDatePicker
                  value={paymentDate}
                  onChange={setPaymentDate}
                  placeholder="결제 일자 선택"
                />
              </div>

              {/* Receipt Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  카드 승인번호 / 영수증 번호 (선택)
                </label>
                <input
                  type="text"
                  value={paymentReceiptNumber}
                  onChange={(e) => setPaymentReceiptNumber(e.target.value)}
                  placeholder="예: APPR-12345678"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Memo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  수납 메모 (선택)
                </label>
                <input
                  type="text"
                  value={paymentMemo}
                  onChange={(e) => setPaymentMemo(e.target.value)}
                  placeholder="예: 1회차 분할 납부, 학부모 카드 결제"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Kakao Notification Notice Box */}
              <div className="p-3.5 rounded-2xl bg-[#FAE100]/25 dark:bg-[#FAE100]/10 border border-[#FAE100] dark:border-amber-700/60 text-xs space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 text-[11px]">
                  <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>학부모 카카오 알림톡 수납 영수증 자동 발송</span>
                </span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                  수납 등록 시 학부모({selectedInvoiceForPayment.student?.parentPhone || '연락처'})님께 <strong>{paymentAmount.toLocaleString()}원</strong> 수납 확인 알림톡이 자동 발송됩니다.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isRecordingPayment}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isRecordingPayment ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>수납 처리 중...</span>
                    </>
                  ) : (
                    <span>수납 완료 등록</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit / Discount Invoice */}
      {isEditModalOpen && selectedInvoiceForEdit && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingEdit) {
              setIsEditModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  청구서 할인 및 상세 수정
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedInvoiceForEdit.student?.name} 학생 ({selectedInvoiceForEdit.billingYearMonth})
                </p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditInvoiceSubmit} className="space-y-4">
              {/* Original Amount display */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">정규 수강료 원금:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedInvoiceForEdit.originalAmount.toLocaleString()}원
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-purple-600 dark:text-purple-400">최종 청구 예정액:</span>
                  <span className="font-extrabold text-purple-600 dark:text-purple-400 text-sm">
                    {Math.max(0, selectedInvoiceForEdit.originalAmount - editDiscountAmount).toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* Discount Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  할인 금액 설정
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={editDiscountAmount || ''}
                    onChange={(e) => setEditDiscountAmount(Number(e.target.value))}
                    min={0}
                    max={selectedInvoiceForEdit.originalAmount}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    원
                  </span>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  납부 마감일
                </label>
                <CustomDatePicker
                  value={editDueDate}
                  onChange={setEditDueDate}
                  placeholder="납부 마감일 선택"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  청구 상세 메모 (예: 형제 할인 10% 적용)
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="할인 사유 또는 비고 메모"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>수정 중...</span>
                    </>
                  ) : (
                    <span>변경사항 저장</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Payment History & Receipt Modal */}
      {isHistoryModalOpen && selectedInvoiceForHistory && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsHistoryModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  수강료 청구 및 수납 영수증 내역
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedInvoiceForHistory.student?.name} 학생 ({selectedInvoiceForHistory.billingYearMonth})
                </p>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">정규 수강료 원금:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedInvoiceForHistory.originalAmount.toLocaleString()}원
                </span>
              </div>
              {selectedInvoiceForHistory.discountAmount > 0 && (
                <div className="flex justify-between text-purple-600 dark:text-purple-400">
                  <span>할인 적용:</span>
                  <span className="font-semibold">
                    -{selectedInvoiceForHistory.discountAmount.toLocaleString()}원
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white">최종 청구 금액:</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {selectedInvoiceForHistory.finalAmount.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">누적 수납액:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedInvoiceForHistory.paidAmount.toLocaleString()}원
                </span>
              </div>
              {selectedInvoiceForHistory.status !== 'PAID' && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span className="font-bold">잔여 미납액:</span>
                  <span className="font-extrabold">
                    {selectedInvoiceForHistory.remainingAmount.toLocaleString()}원
                  </span>
                </div>
              )}
            </div>

            {/* Payment Installments Timeline */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5 flex items-center justify-between">
                <span>회차별 수납 영수증 이력</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  총 {selectedInvoiceForHistory.payments?.length || 0}건
                </span>
              </h4>

              {!selectedInvoiceForHistory.payments || selectedInvoiceForHistory.payments.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p>아직 등록된 수납 내역이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedInvoiceForHistory.payments.map((p, idx) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            #{idx + 1}회차
                          </span>
                          {getMethodBadge(p.method)}
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            +{p.amount.toLocaleString()}원
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{p.paidAt ? p.paidAt.split('T')[0] : ''}</span>
                          {p.processedBy && <span>• 처리자: {p.processedBy.name}</span>}
                          {p.receiptNumber && <span>• 승인: {p.receiptNumber}</span>}
                        </div>
                        {p.memo && <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.memo}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs"
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
