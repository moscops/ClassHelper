import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventCategory, EventColor } from '@prisma/client';

describe('CalendarService', () => {
  let service: CalendarService;

  const mockPrismaService = {
    academyEvent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const baseEvent = {
    id: 1,
    academyId: 1,
    title: '2학기 학부모 설명회',
    category: EventCategory.ACADEMY,
    color: EventColor.INDIGO,
    startDate: new Date('2026-09-15'),
    endDate: null,
    startTime: '16:00',
    endTime: '18:00',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('scopes the query by academyId and orders by startDate ascending', async () => {
      mockPrismaService.academyEvent.findMany.mockResolvedValue([baseEvent]);

      const result = await service.findAll(1);

      expect(mockPrismaService.academyEvent.findMany).toHaveBeenCalledWith({
        where: { academyId: 1 },
        orderBy: { startDate: 'asc' },
      });
      expect(result[0].startDate).toBe('2026-09-15');
      expect(result[0].id).toBe(1);
    });
  });

  describe('create', () => {
    it('creates an event scoped to the caller academy', async () => {
      mockPrismaService.academyEvent.create.mockResolvedValue(baseEvent);

      const result = await service.create(1, {
        title: '2학기 학부모 설명회',
        category: EventCategory.ACADEMY,
        color: EventColor.INDIGO,
        startDate: '2026-09-15',
        startTime: '16:00',
        endTime: '18:00',
      });

      expect(mockPrismaService.academyEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            academyId: 1,
            title: '2학기 학부모 설명회',
          }),
        }),
      );
      expect(result.id).toBe(1);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the event does not exist for this academy', async () => {
      mockPrismaService.academyEvent.findFirst.mockResolvedValue(null);

      await expect(
        service.update(1, 999, { title: '변경된 제목' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.academyEvent.update).not.toHaveBeenCalled();
    });

    it('rejects an update belonging to a different academy (tenancy check)', async () => {
      // findFirst is itself scoped by { id, academyId }, so a cross-academy
      // event correctly resolves to null from Prisma's perspective — this
      // asserts the service surfaces that as a 404, not a silent no-op.
      mockPrismaService.academyEvent.findFirst.mockResolvedValue(null);

      await expect(
        service.update(2, 1, { title: '다른 학원의 수정 시도' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.academyEvent.findFirst).toHaveBeenCalledWith({
        where: { id: 1, academyId: 2 },
      });
    });

    it('updates an existing event', async () => {
      mockPrismaService.academyEvent.findFirst.mockResolvedValue(baseEvent);
      mockPrismaService.academyEvent.update.mockResolvedValue({
        ...baseEvent,
        title: '변경된 제목',
      });

      const result = await service.update(1, 1, { title: '변경된 제목' });

      expect(result.title).toBe('변경된 제목');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the event does not exist for this academy', async () => {
      mockPrismaService.academyEvent.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.academyEvent.delete).not.toHaveBeenCalled();
    });

    it('deletes an existing event', async () => {
      mockPrismaService.academyEvent.findFirst.mockResolvedValue(baseEvent);
      mockPrismaService.academyEvent.delete.mockResolvedValue(baseEvent);

      const result = await service.remove(1, 1);

      expect(mockPrismaService.academyEvent.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result.message).toContain('삭제');
    });
  });
});
