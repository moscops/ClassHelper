import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AttendanceStatus, EnrollmentStatus } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuickCheckType } from './dto/quick-check.dto';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: any;

  const mockAttendance = {
    id: BigInt(1),
    academyId: 10,
    studentId: 100,
    classId: 1,
    date: new Date('2026-08-27T00:00:00.000Z'),
    status: AttendanceStatus.PRESENT,
    checkInTime: new Date('2026-08-27T17:30:00.000Z'),
    checkOutTime: null,
    reason: null,
    isMakeupNeeded: false,
    isMakeupCompleted: false,
    memo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    student: {
      id: 100,
      name: '김민준',
      grade: '중2',
      studentPhone: '010-1111-2222',
      parentPhone: '010-3333-4444',
      parentName: '김학부모',
    },
    class: {
      id: 1,
      name: '중등 수학 심화반',
      subject: '수학',
      schedule: '월/수/금 17:00-19:00',
    },
  };

  beforeEach(async () => {
    prisma = {
      attendance: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      student: {
        findFirst: jest.fn(),
      },
      class: {
        findFirst: jest.fn(),
      },
      enrollment: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordAttendance', () => {
    it('성공적으로 단일 출결을 등록/수정(upsert)한다', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 100, academyId: 10 });
      prisma.class.findFirst.mockResolvedValue({ id: 1, academyId: 10 });
      prisma.attendance.upsert.mockResolvedValue(mockAttendance);

      const result = await service.recordAttendance(10, {
        studentId: 100,
        classId: 1,
        date: '2026-08-27',
        status: AttendanceStatus.PRESENT,
        checkInTime: '2026-08-27T17:30:00.000Z',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.status).toBe(AttendanceStatus.PRESENT);
      expect(result.studentId).toBe(100);
      expect(prisma.attendance.upsert).toHaveBeenCalledTimes(1);
    });

    it('타 학원 학생이거나 존재하지 않는 경우 NotFoundException을 발생시킨다', async () => {
      prisma.student.findFirst.mockResolvedValue(null);
      prisma.class.findFirst.mockResolvedValue({ id: 1, academyId: 10 });

      await expect(
        service.recordAttendance(10, {
          studentId: 999,
          classId: 1,
          date: '2026-08-27',
          status: AttendanceStatus.PRESENT,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchRecordAttendance', () => {
    it('반 전체 학생들의 출결을 일괄 트랜잭션으로 처리한다', async () => {
      prisma.class.findFirst.mockResolvedValue({ id: 1, academyId: 10 });
      prisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          student: { findFirst: jest.fn().mockResolvedValue({ id: 100, academyId: 10 }) },
          attendance: { upsert: jest.fn().mockResolvedValue(mockAttendance) },
        };
        return callback(tx);
      });

      const result = await service.batchRecordAttendance(10, {
        classId: 1,
        date: '2026-08-27',
        records: [
          {
            studentId: 100,
            status: AttendanceStatus.PRESENT,
          },
        ],
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('quickCheck', () => {
    it('등원 원터치 체크 시 checkInTime을 기록하고 PRESENT로 갱신한다', async () => {
      prisma.student.findFirst.mockResolvedValue({ id: 100, academyId: 10 });
      prisma.class.findFirst.mockResolvedValue({ id: 1, academyId: 10 });
      prisma.attendance.findUnique.mockResolvedValue(null);
      prisma.attendance.create.mockResolvedValue(mockAttendance);

      const result = await service.quickCheck(10, {
        studentId: 100,
        classId: 1,
        type: QuickCheckType.CHECK_IN,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(AttendanceStatus.PRESENT);
      expect(prisma.attendance.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getClassDailyRoster', () => {
    it('해당 반의 전체 수강생 목록과 일별 출결 현황판을 올바르게 매핑한다', async () => {
      prisma.class.findFirst.mockResolvedValue({
        id: 1,
        name: '중등 수학 심화반',
        subject: '수학',
        schedule: '월/수/금 17:00-19:00',
      });

      prisma.enrollment.findMany.mockResolvedValue([
        {
          id: 1,
          academyId: 10,
          studentId: 100,
          classId: 1,
          status: EnrollmentStatus.ENROLLED,
          student: {
            id: 100,
            name: '김민준',
            grade: '중2',
            studentPhone: '010-1111-2222',
            parentPhone: '010-3333-4444',
            parentName: '김학부모',
          },
        },
        {
          id: 2,
          academyId: 10,
          studentId: 101,
          classId: 1,
          status: EnrollmentStatus.ENROLLED,
          student: {
            id: 101,
            name: '이서연',
            grade: '중2',
            studentPhone: '010-5555-6666',
            parentPhone: '010-7777-8888',
            parentName: '이학부모',
          },
        },
      ]);

      prisma.attendance.findMany.mockResolvedValue([mockAttendance]);

      const result = await service.getClassDailyRoster(10, {
        classId: 1,
        date: '2026-08-27',
      });

      expect(result.totalStudents).toBe(2);
      expect(result.presentCount).toBe(1);
      expect(result.unmarkedCount).toBe(1);
      expect(result.students).toHaveLength(2);
      expect(result.students[0].attendance).toBeDefined();
      expect(result.students[1].attendance).toBeNull();
    });
  });

  describe('getStats', () => {
    it('출결 통계를 정상적으로 계산하여 반환한다', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        mockAttendance,
        {
          ...mockAttendance,
          id: BigInt(2),
          studentId: 101,
          status: AttendanceStatus.ABSENT,
          isMakeupNeeded: true,
          isMakeupCompleted: false,
        },
      ]);

      const result = await service.getStats(10, {
        classId: 1,
        startDate: '2026-08-01',
        endDate: '2026-08-27',
      });

      expect(result.totalRecords).toBe(2);
      expect(result.totalPresent).toBe(1);
      expect(result.totalAbsent).toBe(1);
      expect(result.averageAttendanceRate).toBe(50);
      expect(result.makeupNeededCount).toBe(1);
    });
  });
});
