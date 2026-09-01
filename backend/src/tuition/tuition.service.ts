import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  GenerateInvoicesResultDto,
  InvoiceResponseDto,
  PaginatedInvoiceResponseDto,
  RevenueStatsResponseDto,
} from './dto/tuition-response.dto';
import {
  EnrollmentStatus,
  InvoiceStatus,
  NotificationChannel,
  NotificationType,
  Prisma,
  StudentStatus,
} from '@prisma/client';

const INVOICE_INCLUDE = {
  student: {
    select: {
      id: true,
      name: true,
      grade: true,
      parentPhone: true,
      parentName: true,
    },
  },
  payments: {
    include: {
      processedBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { paidAt: 'desc' as const },
  },
};

@Injectable()
export class TuitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 1. 월간 수강료 청구서 일괄 자동 생성
   *
   * 대상: 청구 대상월 기준 활성 수강(ENROLLED)이 있고, 재원 상태가 ACTIVE인 원생.
   * 휴원(ON_LEAVE)/퇴원(DISCHARGED) 원생은 청구 대상에서 자동 제외한다 — 휴원/퇴원생에게
   * 원비를 잘못 청구하는 실수를 코드 레벨에서 원천 차단하기 위한 방어 규칙.
   * 이미 해당 월 청구서가 존재하는 원생은 건너뛰어(중복 청구 방지) 여러 번 호출해도 안전(idempotent)하다.
   */
  async generateMonthlyInvoices(
    academyId: number,
    dto: GenerateInvoicesDto,
  ): Promise<GenerateInvoicesResultDto> {
    const { billingYearMonth, dueDate, classId } = dto;

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        academyId,
        status: EnrollmentStatus.ENROLLED,
        ...(classId && { classId }),
        student: { status: StudentStatus.ACTIVE },
      },
      select: {
        studentId: true,
        class: { select: { monthlyFee: true } },
      },
    });

    const feeByStudent = new Map<number, Prisma.Decimal>();
    for (const enrollment of enrollments) {
      const current =
        feeByStudent.get(enrollment.studentId) ?? new Prisma.Decimal(0);
      feeByStudent.set(
        enrollment.studentId,
        current.plus(enrollment.class.monthlyFee),
      );
    }

    if (feeByStudent.size === 0) {
      return {
        billingYearMonth,
        createdCount: 0,
        skippedCount: 0,
        totalInvoicedAmount: 0,
        invoices: [],
      };
    }

    const studentIds = Array.from(feeByStudent.keys());
    const existingInvoices = await this.prisma.tuitionInvoice.findMany({
      where: { academyId, billingYearMonth, studentId: { in: studentIds } },
      select: { studentId: true },
    });
    const alreadyInvoiced = new Set(
      existingInvoices.map((inv) => inv.studentId),
    );

    const toCreate = studentIds.filter((id) => !alreadyInvoiced.has(id));

    const created = await this.prisma.$transaction(
      toCreate.map((studentId) => {
        const amount = feeByStudent.get(studentId)!;
        return this.prisma.tuitionInvoice.create({
          data: {
            academyId,
            studentId,
            billingYearMonth,
            originalAmount: amount,
            discountAmount: 0,
            finalAmount: amount,
            paidAmount: 0,
            status: InvoiceStatus.UNPAID,
            dueDate: new Date(dueDate),
            description: `${billingYearMonth} 정규 수강료`,
          },
          include: INVOICE_INCLUDE,
        });
      }),
    );

    const totalInvoicedAmount = created.reduce(
      (sum, invoice) => sum + Number(invoice.finalAmount),
      0,
    );

    return {
      billingYearMonth,
      createdCount: created.length,
      skippedCount: alreadyInvoiced.size,
      totalInvoicedAmount,
      invoices: created.map((invoice) => this.mapToResponseDto(invoice)),
    };
  }

  /**
   * 2. 청구서 목록 조회 (필터 및 페이징)
   */
  async findAll(
    academyId: number,
    query: QueryInvoicesDto,
  ): Promise<PaginatedInvoiceResponseDto> {
    const {
      billingYearMonth,
      status,
      studentId,
      search,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TuitionInvoiceWhereInput = { academyId };

    if (billingYearMonth) {
      where.billingYearMonth = billingYearMonth;
    }
    if (status) {
      where.status = status;
    }
    if (studentId) {
      where.studentId = studentId;
    }
    if (search && search.trim()) {
      where.student = {
        name: { contains: search.trim(), mode: 'insensitive' },
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.tuitionInvoice.count({ where }),
      this.prisma.tuitionInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ billingYearMonth: 'desc' }, { dueDate: 'asc' }],
        include: INVOICE_INCLUDE,
      }),
    ]);

    return {
      items: items.map((item) => this.mapToResponseDto(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 3. 청구서 상세 조회
   */
  async findOne(academyId: number, id: number): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.tuitionInvoice.findFirst({
      where: { id, academyId },
      include: INVOICE_INCLUDE,
    });

    if (!invoice) {
      throw new NotFoundException('해당 청구서를 찾을 수 없습니다.');
    }

    return this.mapToResponseDto(invoice);
  }

  /**
   * 4. 청구서 할인/수정
   */
  async update(
    academyId: number,
    id: number,
    dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    const existing = await this.prisma.tuitionInvoice.findFirst({
      where: { id, academyId },
    });

    if (!existing) {
      throw new NotFoundException('수정할 청구서를 찾을 수 없습니다.');
    }
    if (existing.status === InvoiceStatus.VOID) {
      throw new BadRequestException('취소된 청구서는 수정할 수 없습니다.');
    }

    const discountAmount =
      dto.discountAmount !== undefined
        ? new Prisma.Decimal(dto.discountAmount)
        : existing.discountAmount;
    const finalAmount = existing.originalAmount.minus(discountAmount);

    if (finalAmount.isNegative()) {
      throw new BadRequestException(
        '할인 금액이 원래 청구 금액을 초과할 수 없습니다.',
      );
    }

    const status = this.resolveStatus(finalAmount, existing.paidAmount);

    const updated = await this.prisma.tuitionInvoice.update({
      where: { id },
      data: {
        discountAmount,
        finalAmount,
        status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        description: dto.description,
      },
      include: INVOICE_INCLUDE,
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * 5. 청구서 취소 (VOID)
   *
   * 이미 수납된 금액이 있는 청구서는 취소를 막는다 — 취소를 허용하면 TuitionPayment 기록만
   * 남고 청구서는 VOID가 되어 "받은 돈은 있는데 청구서는 없다"는 회계상 불일치가 생기기 때문에,
   * 먼저 환불(수납 취소) 처리를 하도록 강제하는 방어 규칙.
   */
  async voidInvoice(
    academyId: number,
    id: number,
  ): Promise<InvoiceResponseDto> {
    const existing = await this.prisma.tuitionInvoice.findFirst({
      where: { id, academyId },
    });

    if (!existing) {
      throw new NotFoundException('취소할 청구서를 찾을 수 없습니다.');
    }
    if (existing.status === InvoiceStatus.VOID) {
      throw new BadRequestException('이미 취소된 청구서입니다.');
    }
    if (existing.paidAmount.greaterThan(0)) {
      throw new BadRequestException(
        '이미 수납된 금액이 있는 청구서는 취소할 수 없습니다. 환불 처리 후 다시 시도해주세요.',
      );
    }

    const updated = await this.prisma.tuitionInvoice.update({
      where: { id },
      data: { status: InvoiceStatus.VOID },
      include: INVOICE_INCLUDE,
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * 6. 수강료 수납 처리
   *
   * 남은 청구 금액(finalAmount - paidAmount)을 초과하는 결제는 거부한다 — 과오납이
   * 조용히 기록되는 것을 막기 위한 방어 규칙(문서상 규정되어 있지 않았으나 데이터 정합성을 위해 추가).
   */
  async recordPayment(
    academyId: number,
    invoiceId: number,
    requesterId: number,
    dto: CreatePaymentDto,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.tuitionInvoice.findFirst({
      where: { id: invoiceId, academyId },
    });

    if (!invoice) {
      throw new NotFoundException('해당 청구서를 찾을 수 없습니다.');
    }
    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException(
        '취소된 청구서에는 수납을 등록할 수 없습니다.',
      );
    }

    const amount = new Prisma.Decimal(dto.amount);
    const remaining = invoice.finalAmount.minus(invoice.paidAmount);

    if (amount.greaterThan(remaining)) {
      throw new BadRequestException(
        `결제 금액이 남은 청구 금액(${remaining.toString()}원)을 초과합니다.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.tuitionPayment.create({
        data: {
          academyId,
          invoiceId,
          amount,
          method: dto.method,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
          receiptNumber: dto.receiptNumber,
          memo: dto.memo,
          processedById: dto.processedById ?? requesterId,
        },
      });

      const newPaidAmount = invoice.paidAmount.plus(amount);
      const status = this.resolveStatus(invoice.finalAmount, newPaidAmount);

      return tx.tuitionInvoice.update({
        where: { id: invoiceId },
        data: { paidAmount: newPaidAmount, status },
        include: INVOICE_INCLUDE,
      });
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * 7. 미납자 명단 조회 (미납 + 부분수납)
   */
  async getUnpaidInvoices(
    academyId: number,
    billingYearMonth?: string,
  ): Promise<InvoiceResponseDto[]> {
    const invoices = await this.prisma.tuitionInvoice.findMany({
      where: {
        academyId,
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
        ...(billingYearMonth && { billingYearMonth }),
      },
      orderBy: { dueDate: 'asc' },
      include: INVOICE_INCLUDE,
    });

    return invoices.map((invoice) => this.mapToResponseDto(invoice));
  }

  /**
   * 8. 미납자 대상 카카오 납부 안내 알림톡 발송
   */
  async sendPaymentReminder(
    academyId: number,
    invoiceId: number,
  ): Promise<{ message: string }> {
    const invoice = await this.prisma.tuitionInvoice.findFirst({
      where: { id: invoiceId, academyId },
      include: { student: true },
    });

    if (!invoice) {
      throw new NotFoundException('해당 청구서를 찾을 수 없습니다.');
    }
    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.VOID
    ) {
      throw new BadRequestException(
        '완납되었거나 취소된 청구서에는 납부 안내를 발송할 수 없습니다.',
      );
    }

    const remaining = invoice.finalAmount.minus(invoice.paidAmount);

    await this.notificationsService.createNotification(academyId, {
      studentId: invoice.studentId,
      type: NotificationType.TUITION_DUE,
      channel: NotificationChannel.KAKAO,
      title: '수강료 납부 안내',
      message: `${invoice.student.name} 학생 ${invoice.billingYearMonth} 수강료 ${remaining.toString()}원이 미납되었습니다. 납부기한: ${invoice.dueDate.toISOString().split('T')[0]}`,
      targetPhone: invoice.student.parentPhone,
    });

    return { message: '납부 안내 알림톡이 발송되었습니다.' };
  }

  /**
   * 9. 학원 월별 매출/수납률 통계
   */
  async getRevenueStats(
    academyId: number,
    billingYearMonth: string,
  ): Promise<RevenueStatsResponseDto> {
    const invoices = await this.prisma.tuitionInvoice.findMany({
      where: { academyId, billingYearMonth },
      select: { finalAmount: true, paidAmount: true, status: true },
    });

    const active = invoices.filter(
      (invoice) => invoice.status !== InvoiceStatus.VOID,
    );
    const totalInvoicedAmount = active.reduce(
      (sum, i) => sum + Number(i.finalAmount),
      0,
    );
    const totalCollectedAmount = active.reduce(
      (sum, i) => sum + Number(i.paidAmount),
      0,
    );
    const collectionRate =
      totalInvoicedAmount > 0
        ? Number(
            ((totalCollectedAmount / totalInvoicedAmount) * 100).toFixed(1),
          )
        : 0;

    return {
      billingYearMonth,
      totalInvoicedAmount,
      totalCollectedAmount,
      collectionRate,
      paidCount: invoices.filter((i) => i.status === InvoiceStatus.PAID).length,
      unpaidCount: invoices.filter(
        (i) =>
          i.status === InvoiceStatus.UNPAID ||
          i.status === InvoiceStatus.PARTIALLY_PAID,
      ).length,
      voidCount: invoices.filter((i) => i.status === InvoiceStatus.VOID).length,
    };
  }

  /**
   * Helper: 결제 반영 후 청구 상태 재계산
   */
  private resolveStatus(
    finalAmount: Prisma.Decimal,
    paidAmount: Prisma.Decimal,
  ): InvoiceStatus {
    if (
      paidAmount.greaterThanOrEqualTo(finalAmount) &&
      finalAmount.greaterThan(0)
    ) {
      return InvoiceStatus.PAID;
    }
    if (paidAmount.greaterThan(0)) {
      return InvoiceStatus.PARTIALLY_PAID;
    }
    return InvoiceStatus.UNPAID;
  }

  /**
   * Helper: DTO Mapping
   */
  private mapToResponseDto(invoice: any): InvoiceResponseDto {
    return {
      id: invoice.id,
      academyId: invoice.academyId,
      studentId: invoice.studentId,
      billingYearMonth: invoice.billingYearMonth,
      originalAmount: Number(invoice.originalAmount),
      discountAmount: Number(invoice.discountAmount),
      finalAmount: Number(invoice.finalAmount),
      paidAmount: Number(invoice.paidAmount),
      remainingAmount: Number(invoice.finalAmount) - Number(invoice.paidAmount),
      status: invoice.status,
      dueDate:
        invoice.dueDate instanceof Date
          ? invoice.dueDate.toISOString().split('T')[0]
          : invoice.dueDate,
      description: invoice.description,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      student: invoice.student
        ? {
            id: invoice.student.id,
            name: invoice.student.name,
            grade: invoice.student.grade,
            parentPhone: invoice.student.parentPhone,
            parentName: invoice.student.parentName,
          }
        : undefined,
      payments: invoice.payments
        ? invoice.payments.map((payment: any) => ({
            id: payment.id,
            invoiceId: payment.invoiceId,
            amount: Number(payment.amount),
            method: payment.method,
            paidAt: payment.paidAt,
            receiptNumber: payment.receiptNumber,
            memo: payment.memo,
            processedBy: payment.processedBy
              ? { id: payment.processedBy.id, name: payment.processedBy.name }
              : null,
            createdAt: payment.createdAt,
          }))
        : undefined,
    };
  }
}
