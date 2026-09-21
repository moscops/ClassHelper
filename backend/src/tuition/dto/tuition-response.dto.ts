import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';

export class InvoiceStudentDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '김민준' })
  name: string;

  @ApiPropertyOptional({ example: '중2' })
  grade?: string | null;

  @ApiProperty({ example: '010-1234-5678' })
  parentPhone: string;

  @ApiPropertyOptional({ example: '김학부모' })
  parentName?: string | null;
}

export class PaymentProcessedByDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: '이실장' })
  name: string;
}

export class PaymentResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  invoiceId: number;

  @ApiProperty({ example: 350000 })
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CARD })
  method: PaymentMethod;

  @ApiProperty({ example: '2026-09-05T10:30:00.000Z' })
  paidAt: Date;

  @ApiPropertyOptional({ example: 'RCP-20260905-0001' })
  receiptNumber?: string | null;

  @ApiPropertyOptional({ example: '1회차 분할 납부' })
  memo?: string | null;

  @ApiPropertyOptional({ type: PaymentProcessedByDto })
  processedBy?: PaymentProcessedByDto | null;

  @ApiProperty({ example: '2026-09-05T10:30:00.000Z' })
  createdAt: Date;
}

export class InvoiceResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  academyId: number;

  @ApiProperty({ example: 1 })
  studentId: number;

  @ApiProperty({ example: '2026-09' })
  billingYearMonth: string;

  @ApiProperty({ example: 350000 })
  originalAmount: number;

  @ApiProperty({ example: 30000 })
  discountAmount: number;

  @ApiProperty({ example: 320000 })
  finalAmount: number;

  @ApiProperty({ example: 200000 })
  paidAmount: number;

  @ApiProperty({
    example: 120000,
    description: '잔여 미납 금액 (finalAmount - paidAmount)',
  })
  remainingAmount: number;

  @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.PARTIALLY_PAID })
  status: InvoiceStatus;

  @ApiProperty({ example: '2026-09-10' })
  dueDate: string;

  @ApiPropertyOptional({ example: '9월 정규반 수강료 + 형제 할인 적용' })
  description?: string | null;

  @ApiProperty({ example: '2026-08-31T09:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-31T09:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: InvoiceStudentDto })
  student?: InvoiceStudentDto;

  @ApiPropertyOptional({ type: [PaymentResponseDto] })
  payments?: PaymentResponseDto[];
}

export class PaginatedInvoiceResponseDto {
  @ApiProperty({ type: [InvoiceResponseDto] })
  items: InvoiceResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class GenerateInvoicesResultDto {
  @ApiProperty({ example: '2026-09' })
  billingYearMonth: string;

  @ApiProperty({ example: 38, description: '신규 생성된 청구서 수' })
  createdCount: number;

  @ApiProperty({
    example: 2,
    description:
      '이미 해당 월 청구서가 존재하여 건너뛴 원생 수 (중복 청구 방지)',
  })
  skippedCount: number;

  @ApiProperty({ example: 12500000, description: '이번 회차 신규 청구된 총액' })
  totalInvoicedAmount: number;

  @ApiProperty({ type: [InvoiceResponseDto] })
  invoices: InvoiceResponseDto[];
}

export class RevenueStatsResponseDto {
  @ApiProperty({ example: '2026-09' })
  billingYearMonth: string;

  @ApiProperty({
    example: 12500000,
    description: '해당 월 총 청구액 (VOID 제외)',
  })
  totalInvoicedAmount: number;

  @ApiProperty({ example: 9800000, description: '해당 월 총 수납액' })
  totalCollectedAmount: number;

  @ApiProperty({
    example: 78.4,
    description: '수납률 (%) = 수납액 / 청구액 * 100',
  })
  collectionRate: number;

  @ApiProperty({ example: 5, description: '완납 청구서 수' })
  paidCount: number;

  @ApiProperty({ example: 3, description: '미납/부분수납 청구서 수' })
  unpaidCount: number;

  @ApiProperty({ example: 0, description: '취소된 청구서 수' })
  voidCount: number;
}
