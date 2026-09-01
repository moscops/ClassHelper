import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TuitionService } from './tuition.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InvoiceStatus, PaymentMethod, Prisma } from '@prisma/client';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('TuitionService', () => {
  let service: TuitionService;

  const mockPrismaService = {
    enrollment: {
      findMany: jest.fn(),
    },
    tuitionInvoice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    tuitionPayment: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TuitionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<TuitionService>(TuitionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMonthlyInvoices', () => {
    it('returns zero created invoices when there are no active enrollments', async () => {
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);

      const result = await service.generateMonthlyInvoices(1, {
        billingYearMonth: '2026-09',
        dueDate: '2026-09-10',
      });

      expect(result).toEqual({
        billingYearMonth: '2026-09',
        createdCount: 0,
        skippedCount: 0,
        totalInvoicedAmount: 0,
        invoices: [],
      });
      expect(mockPrismaService.tuitionInvoice.findMany).not.toHaveBeenCalled();
    });

    it('aggregates monthly fees per student and skips students already invoiced', async () => {
      // studentId 10 is enrolled in two classes (fees should be summed);
      // studentId 20 already has an invoice this month and must be skipped.
      mockPrismaService.enrollment.findMany.mockResolvedValue([
        { studentId: 10, class: { monthlyFee: decimal(200000) } },
        { studentId: 10, class: { monthlyFee: decimal(150000) } },
        { studentId: 20, class: { monthlyFee: decimal(300000) } },
      ]);
      mockPrismaService.tuitionInvoice.findMany.mockResolvedValue([
        { studentId: 20 },
      ]);

      const createdInvoice = {
        id: 1,
        academyId: 1,
        studentId: 10,
        billingYearMonth: '2026-09',
        originalAmount: decimal(350000),
        discountAmount: decimal(0),
        finalAmount: decimal(350000),
        paidAmount: decimal(0),
        status: InvoiceStatus.UNPAID,
        dueDate: new Date('2026-09-10'),
        description: '2026-09 정규 수강료',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.$transaction.mockResolvedValue([createdInvoice]);

      const result = await service.generateMonthlyInvoices(1, {
        billingYearMonth: '2026-09',
        dueDate: '2026-09-10',
      });

      expect(result.createdCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.totalInvoicedAmount).toBe(350000);
      expect(result.invoices[0].studentId).toBe(10);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when invoice does not exist', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const baseInvoice = {
      id: 1,
      academyId: 1,
      studentId: 10,
      billingYearMonth: '2026-09',
      originalAmount: decimal(350000),
      discountAmount: decimal(0),
      finalAmount: decimal(350000),
      paidAmount: decimal(0),
      status: InvoiceStatus.UNPAID,
      dueDate: new Date('2026-09-10'),
    };

    it('throws NotFoundException when invoice does not exist', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue(null);

      await expect(
        service.update(1, 999, { discountAmount: 10000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects updates to a VOID invoice', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue({
        ...baseInvoice,
        status: InvoiceStatus.VOID,
      });

      await expect(
        service.update(1, 1, { discountAmount: 10000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a discount larger than the original amount', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue(baseInvoice);

      await expect(
        service.update(1, 1, { discountAmount: 999999 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('recalculates finalAmount and status after a valid discount', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue(baseInvoice);
      mockPrismaService.tuitionInvoice.update.mockImplementation(({ data }) =>
        Promise.resolve({ ...baseInvoice, ...data }),
      );

      const result = await service.update(1, 1, { discountAmount: 350000 });

      expect(result.finalAmount).toBe(0);
      expect(mockPrismaService.tuitionInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: InvoiceStatus.UNPAID }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('applies billingYearMonth, status, studentId and search filters to the where clause', async () => {
      mockPrismaService.tuitionInvoice.count.mockResolvedValue(1);
      mockPrismaService.tuitionInvoice.findMany.mockResolvedValue([]);

      await service.findAll(1, {
        billingYearMonth: '2026-09',
        status: InvoiceStatus.UNPAID,
        studentId: 10,
        search: '김민준',
        page: 1,
        limit: 20,
      });

      const [findManyArgs] =
        mockPrismaService.tuitionInvoice.findMany.mock.calls[0];
      expect(findManyArgs.where).toMatchObject({
        academyId: 1,
        billingYearMonth: '2026-09',
        status: InvoiceStatus.UNPAID,
        studentId: 10,
        student: { name: { contains: '김민준', mode: 'insensitive' } },
      });
    });
  });

  describe('getUnpaidInvoices', () => {
    it('queries only UNPAID and PARTIALLY_PAID invoices ordered by due date', async () => {
      mockPrismaService.tuitionInvoice.findMany.mockResolvedValue([]);

      await service.getUnpaidInvoices(1, '2026-09');

      expect(mockPrismaService.tuitionInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            academyId: 1,
            billingYearMonth: '2026-09',
            status: {
              in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID],
            },
          }),
        }),
      );
    });
  });

  describe('voidInvoice', () => {
    it('throws NotFoundException when invoice does not exist', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue(null);

      await expect(service.voidInvoice(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('voids an unpaid invoice with no payments recorded', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue({
        id: 1,
        status: InvoiceStatus.UNPAID,
        paidAmount: decimal(0),
      });
      mockPrismaService.tuitionInvoice.update.mockResolvedValue({
        id: 1,
        studentId: 10,
        billingYearMonth: '2026-09',
        originalAmount: decimal(350000),
        discountAmount: decimal(0),
        finalAmount: decimal(350000),
        paidAmount: decimal(0),
        status: InvoiceStatus.VOID,
        dueDate: new Date('2026-09-10'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.voidInvoice(1, 1);

      expect(result.status).toBe(InvoiceStatus.VOID);
    });

    it('rejects voiding an invoice that already has payments recorded', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue({
        id: 1,
        status: InvoiceStatus.PARTIALLY_PAID,
        paidAmount: decimal(100000),
      });

      await expect(service.voidInvoice(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects voiding an already-VOID invoice', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue({
        id: 1,
        status: InvoiceStatus.VOID,
        paidAmount: decimal(0),
      });

      await expect(service.voidInvoice(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('recordPayment', () => {
    const invoice = {
      id: 1,
      academyId: 1,
      studentId: 10,
      finalAmount: decimal(350000),
      paidAmount: decimal(0),
      status: InvoiceStatus.UNPAID,
    };

    it('throws NotFoundException when invoice does not exist', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue(null);

      await expect(
        service.recordPayment(1, 999, 5, {
          amount: 100000,
          method: PaymentMethod.CARD,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects payments on a VOID invoice', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue({
        ...invoice,
        status: InvoiceStatus.VOID,
      });

      await expect(
        service.recordPayment(1, 1, 5, {
          amount: 100000,
          method: PaymentMethod.CARD,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a payment that exceeds the remaining balance', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue(invoice);

      await expect(
        service.recordPayment(1, 1, 5, {
          amount: 999999,
          method: PaymentMethod.CARD,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('marks the invoice PAID once the full remaining balance is collected', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue(invoice);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          tuitionPayment: { create: jest.fn().mockResolvedValue({}) },
          tuitionInvoice: {
            update: jest.fn().mockResolvedValue({
              ...invoice,
              paidAmount: decimal(350000),
              status: InvoiceStatus.PAID,
              discountAmount: decimal(0),
              originalAmount: decimal(350000),
              billingYearMonth: '2026-09',
              dueDate: new Date('2026-09-10'),
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.recordPayment(1, 1, 5, {
        amount: 350000,
        method: PaymentMethod.CARD,
      });

      expect(result.status).toBe(InvoiceStatus.PAID);
    });
  });

  describe('sendPaymentReminder', () => {
    it('throws NotFoundException when invoice does not exist', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue(null);

      await expect(service.sendPaymentReminder(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects sending a reminder for an already-PAID invoice', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue({
        id: 1,
        status: InvoiceStatus.PAID,
        student: { name: '김민준', parentPhone: '010-1234-5678' },
      });

      await expect(service.sendPaymentReminder(1, 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        mockNotificationsService.createNotification,
      ).not.toHaveBeenCalled();
    });

    it('sends a KAKAO reminder for an unpaid invoice', async () => {
      mockPrismaService.tuitionInvoice.findFirst.mockResolvedValue({
        id: 1,
        studentId: 10,
        status: InvoiceStatus.UNPAID,
        billingYearMonth: '2026-09',
        finalAmount: decimal(350000),
        paidAmount: decimal(0),
        dueDate: new Date('2026-09-10'),
        student: { name: '김민준', parentPhone: '010-1234-5678' },
      });
      mockNotificationsService.createNotification.mockResolvedValue({});

      const result = await service.sendPaymentReminder(1, 1);

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ targetPhone: '010-1234-5678' }),
      );
      expect(result.message).toContain('발송');
    });
  });

  describe('getRevenueStats', () => {
    it('excludes VOID invoices from totals and computes the collection rate', async () => {
      mockPrismaService.tuitionInvoice.findMany.mockResolvedValue([
        {
          finalAmount: decimal(350000),
          paidAmount: decimal(350000),
          status: InvoiceStatus.PAID,
        },
        {
          finalAmount: decimal(300000),
          paidAmount: decimal(100000),
          status: InvoiceStatus.PARTIALLY_PAID,
        },
        {
          finalAmount: decimal(400000),
          paidAmount: decimal(0),
          status: InvoiceStatus.VOID,
        },
      ]);

      const result = await service.getRevenueStats(1, '2026-09');

      expect(result.totalInvoicedAmount).toBe(650000);
      expect(result.totalCollectedAmount).toBe(450000);
      expect(result.collectionRate).toBeCloseTo(69.2, 1);
      expect(result.paidCount).toBe(1);
      expect(result.unpaidCount).toBe(1);
      expect(result.voidCount).toBe(1);
    });
  });
});
