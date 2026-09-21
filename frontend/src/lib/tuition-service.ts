import { api } from './api';

export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
export type PaymentMethod = 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'EASY_PAY' | 'OTHER';

export interface InvoiceStudent {
  id: number;
  name: string;
  grade?: string | null;
  parentPhone: string;
  parentName?: string | null;
}

export interface PaymentProcessedBy {
  id: number;
  name: string;
}

export interface PaymentItem {
  id: number;
  invoiceId: number;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  receiptNumber?: string | null;
  memo?: string | null;
  processedBy?: PaymentProcessedBy | null;
  createdAt: string;
}

export interface InvoiceItem {
  id: number;
  academyId: number;
  studentId: number;
  billingYearMonth: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: InvoiceStudent;
  payments?: PaymentItem[];
}

export interface PaginatedInvoiceResponse {
  items: InvoiceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GenerateInvoicesResult {
  billingYearMonth: string;
  createdCount: number;
  skippedCount: number;
  totalInvoicedAmount: number;
  invoices: InvoiceItem[];
}

export interface RevenueStatsResponse {
  billingYearMonth: string;
  totalInvoicedAmount: number;
  totalCollectedAmount: number;
  collectionRate: number;
  paidCount: number;
  unpaidCount: number;
  voidCount: number;
}

export interface GenerateInvoicesDto {
  billingYearMonth: string;
  dueDate: string;
  classId?: number;
}

export interface QueryInvoicesDto {
  billingYearMonth?: string;
  status?: InvoiceStatus;
  studentId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateInvoiceDto {
  discountAmount?: number;
  dueDate?: string;
  description?: string;
}

export interface CreatePaymentDto {
  amount: number;
  method: PaymentMethod;
  paidAt?: string;
  receiptNumber?: string;
  memo?: string;
}

export const tuitionService = {
  // 월간 수강료 청구서 일괄 자동 생성
  async generateInvoices(dto: GenerateInvoicesDto): Promise<GenerateInvoicesResult> {
    const response = await api.post<GenerateInvoicesResult>('/tuition/invoices/generate', dto);
    return response.data;
  },

  // 청구서 목록 조회 (필터 & 페이징)
  async getInvoices(query: QueryInvoicesDto = {}): Promise<PaginatedInvoiceResponse> {
    const response = await api.get<PaginatedInvoiceResponse>('/tuition/invoices', {
      params: query,
    });
    return response.data;
  },

  // 미납자 명단 조회
  async getUnpaidInvoices(billingYearMonth?: string): Promise<InvoiceItem[]> {
    const response = await api.get<InvoiceItem[]>('/tuition/invoices/unpaid', {
      params: billingYearMonth ? { billingYearMonth } : {},
    });
    return response.data;
  },

  // 월별 매출/수납률 통계 조회
  async getRevenueStats(billingYearMonth: string): Promise<RevenueStatsResponse> {
    const response = await api.get<RevenueStatsResponse>('/tuition/stats', {
      params: { billingYearMonth },
    });
    return response.data;
  },

  // 청구서 상세 조회
  async getInvoice(id: number): Promise<InvoiceItem> {
    const response = await api.get<InvoiceItem>(`/tuition/invoices/${id}`);
    return response.data;
  },

  // 개별 청구서 할인/수정
  async updateInvoice(id: number, dto: UpdateInvoiceDto): Promise<InvoiceItem> {
    const response = await api.patch<InvoiceItem>(`/tuition/invoices/${id}`, dto);
    return response.data;
  },

  // 청구서 취소 (VOID)
  async voidInvoice(id: number): Promise<InvoiceItem> {
    const response = await api.patch<InvoiceItem>(`/tuition/invoices/${id}/void`);
    return response.data;
  },

  // 수강료 수납 처리
  async recordPayment(id: number, dto: CreatePaymentDto): Promise<InvoiceItem> {
    const response = await api.post<InvoiceItem>(`/tuition/invoices/${id}/payments`, dto);
    return response.data;
  },

  // 미납자 대상 카카오 납부 안내 알림톡 발송
  async sendPaymentReminder(id: number): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/tuition/invoices/${id}/send-reminder`);
    return response.data;
  },
};
