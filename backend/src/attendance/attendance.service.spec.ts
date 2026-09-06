import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AttendanceStatus, EnrollmentStatus } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QuickCheckType } from './dto/quick-check.dto';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: any;
  let notificationsService: any;

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
        findMany: jest.fn(),
      },
      class: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      enrollment: {
        findMany: jest.fn(),
      },
      notification: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      academy: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({
        id: 1,
        title: '미등원 알림: 김민준 학생',
      }),
      getUnreadCount: jest.fn().mockResolvedValue({
        unreadCount: 1,
        unattendedAlertCount: 1,
        hasUnattendedAlert: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
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
          student: {
            findFirst: jest.fn().mockResolvedValue({ id: 100, academyId: 10 }),
          },
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

  describe('getUnattendedStatus', () => {
    it('오늘 수업이 있는 반에서 아직 출결 체크를 하지 않은 미등원 학생을 감지한다', async () => {
      prisma.class.findMany.mockResolvedValue([
        {
          id: 1,
          name: '중등 수학 심화반',
          schedule: '매일 17:00-19:00',
          enrollments: [
            {
              student: {
                id: 100,
                name: '김민준',
                grade: '중2',
                parentPhone: '010-3333-4444',
                studentPhone: '010-1111-2222',
              },
            },
          ],
          attendances: [],
        },
      ]);
      prisma.notification.findMany.mockResolvedValue([]);

      const result = await service.getUnattendedStatus(10);

      expect(result.isUnattendedAlertActive).toBe(true);
      expect(result.unattendedCount).toBe(1);
      expect(result.unattendedStudents[0].studentName).toBe('김민준');
      expect(result.unattendedStudents[0].isAlertSent).toBe(false);
    });
  });

  describe('triggerUnattendedAlerts', () => {
    it('미등원 학생에게 카카오 안심 알림톡을 발송하고 결과를 반환한다', async () => {
      prisma.class.findMany.mockResolvedValue([
        {
          id: 1,
          name: '중등 수학 심화반',
          schedule: '매일 17:00-19:00',
          enrollments: [
            {
              student: {
                id: 100,
                name: '김민준',
                grade: '중2',
                parentPhone: '010-3333-4444',
                studentPhone: '010-1111-2222',
              },
            },
          ],
          attendances: [],
        },
      ]);
      prisma.notification.findMany.mockResolvedValue([]);

      const result = await service.triggerUnattendedAlerts(10);

      expect(result.sentCount).toBe(1);
      expect(notificationsService.createNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('키오스크 (비인증) 출석 체크', () => {
    const DAY_CHARS = ['일', '월', '화', '수', '목', '금', '토'];
    const todayIdx = new Date().getDay();
    const todayChar = DAY_CHARS[todayIdx];
    const otherDayChar = DAY_CHARS[(todayIdx + 1) % 7];

    describe('kioskLookup', () => {
      it('유효하지 않은 kioskToken이면 NotFoundException을 던진다', async () => {
        prisma.academy.findUnique.mockResolvedValue(null);

        await expect(
          service.kioskLookup({ kioskToken: 'invalid', phoneLast4: '1234' }),
        ).rejects.toThrow(NotFoundException);
        expect(prisma.student.findMany).not.toHaveBeenCalled();
      });

      it('전화번호 뒷자리와 일치하는 학생이 없으면 NotFoundException을 던진다', async () => {
        prisma.academy.findUnique.mockResolvedValue({
          id: 10,
          status: 'ACTIVE',
        });
        prisma.student.findMany.mockResolvedValue([
          {
            id: 1,
            name: '김민준',
            studentPhone: '010-1111-2222',
            parentPhone: '010-9999-8888',
          },
        ]);

        await expect(
          service.kioskLookup({ kioskToken: 'valid', phoneLast4: '0000' }),
        ).rejects.toThrow(NotFoundException);
      });

      it('학생 본인 번호가 있으면 본인 번호로 매칭한다 (보호자 번호는 무시)', async () => {
        prisma.academy.findUnique.mockResolvedValue({
          id: 10,
          status: 'ACTIVE',
        });
        prisma.student.findMany.mockResolvedValue([
          {
            id: 1,
            name: '김민준',
            studentPhone: '010-1111-2222',
            parentPhone: '010-9999-2222',
          },
        ]);
        prisma.enrollment.findMany.mockResolvedValue([]);

        const result = await service.kioskLookup({
          kioskToken: 'valid',
          phoneLast4: '2222',
        });

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].studentId).toBe(1);
      });

      it('학생 본인 번호가 없으면 보호자 번호 뒷자리로 대체 매칭한다', async () => {
        prisma.academy.findUnique.mockResolvedValue({
          id: 10,
          status: 'ACTIVE',
        });
        prisma.student.findMany.mockResolvedValue([
          {
            id: 2,
            name: '이서연',
            studentPhone: null,
            parentPhone: '010-3333-4444',
          },
        ]);
        prisma.enrollment.findMany.mockResolvedValue([]);

        const result = await service.kioskLookup({
          kioskToken: 'valid',
          phoneLast4: '4444',
        });

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].studentId).toBe(2);
      });

      it('형제/자매처럼 같은 뒷자리로 여러 학생이 매칭되면 전부 반환한다', async () => {
        prisma.academy.findUnique.mockResolvedValue({
          id: 10,
          status: 'ACTIVE',
        });
        prisma.student.findMany.mockResolvedValue([
          {
            id: 1,
            name: '김민준',
            studentPhone: null,
            parentPhone: '010-1111-5678',
          },
          {
            id: 2,
            name: '김서연',
            studentPhone: null,
            parentPhone: '010-1111-5678',
          },
        ]);
        prisma.enrollment.findMany.mockResolvedValue([]);

        const result = await service.kioskLookup({
          kioskToken: 'valid',
          phoneLast4: '5678',
        });

        expect(result.matches).toHaveLength(2);
      });

      it('오늘 요일에 해당하는 수업이 있으면 그 수업만 반환한다', async () => {
        prisma.academy.findUnique.mockResolvedValue({
          id: 10,
          status: 'ACTIVE',
        });
        prisma.student.findMany.mockResolvedValue([
          {
            id: 1,
            name: '김민준',
            studentPhone: '010-0000-1234',
            parentPhone: '010-0000-0000',
          },
        ]);
        prisma.enrollment.findMany.mockResolvedValue([
          {
            class: {
              id: 1,
              name: '오늘 수업',
              schedule: `${todayChar} 17:00-19:00`,
            },
          },
          {
            class: {
              id: 2,
              name: '다른 요일 수업',
              schedule: `${otherDayChar} 10:00-12:00`,
            },
          },
        ]);

        const result = await service.kioskLookup({
          kioskToken: 'valid',
          phoneLast4: '1234',
        });

        expect(result.matches[0].classes).toEqual([
          { id: 1, name: '오늘 수업' },
        ]);
      });

      it('오늘 요일에 매칭되는 수업이 없으면 등록된 전체 수업을 반환한다', async () => {
        prisma.academy.findUnique.mockResolvedValue({
          id: 10,
          status: 'ACTIVE',
        });
        prisma.student.findMany.mockResolvedValue([
          {
            id: 1,
            name: '김민준',
            studentPhone: '010-0000-1234',
            parentPhone: '010-0000-0000',
          },
        ]);
        prisma.enrollment.findMany.mockResolvedValue([
          { class: { id: 1, name: '수업A', schedule: null } },
          { class: { id: 2, name: '수업B', schedule: '새벽반 06:00-07:00' } },
        ]);

        const result = await service.kioskLookup({
          kioskToken: 'valid',
          phoneLast4: '1234',
        });

        expect(result.matches[0].classes).toEqual([
          { id: 1, name: '수업A' },
          { id: 2, name: '수업B' },
        ]);
      });
    });

    describe('kioskCheckIn', () => {
      it('kioskToken과 phoneLast4가 studentId와 일치하면 quickCheck에 위임한다', async () => {
        prisma.academy.findUnique.mockResolvedValue({
          id: 10,
          status: 'ACTIVE',
        });
        prisma.student.findFirst.mockResolvedValue({
          studentPhone: '010-1111-2222',
          parentPhone: '010-9999-9999',
        });
        const quickCheckSpy = jest
          .spyOn(service, 'quickCheck')
          .mockResolvedValue(mockAttendance as any);

        const result = await service.kioskCheckIn({
          kioskToken: 'valid',
          phoneLast4: '2222',
          studentId: 100,
          classId: 1,
          type: QuickCheckType.CHECK_IN,
        });

        expect(quickCheckSpy).toHaveBeenCalledWith(10, {
          studentId: 100,
          classId: 1,
          type: QuickCheckType.CHECK_IN,
        });
        expect(result).toBe(mockAttendance);
      });

      it('유효하지 않은 kioskToken이면 quickCheck를 호출하지 않고 예외를 던진다', async () => {
        prisma.academy.findUnique.mockResolvedValue(null);
        const quickCheckSpy = jest.spyOn(service, 'quickCheck');

        await expect(
          service.kioskCheckIn({
            kioskToken: 'invalid',
            phoneLast4: '2222',
            studentId: 100,
            classId: 1,
            type: QuickCheckType.CHECK_IN,
          }),
        ).rejects.toThrow(NotFoundException);
        expect(quickCheckSpy).not.toHaveBeenCalled();
      });

      it('studentId는 유효해도 phoneLast4가 그 학생 번호와 다르면 조작을 막는다', async () => {
        prisma.academy.findUnique.mockResolvedValue({
          id: 10,
          status: 'ACTIVE',
        });
        prisma.student.findFirst.mockResolvedValue({
          studentPhone: '010-1111-2222',
          parentPhone: '010-9999-9999',
        });
        const quickCheckSpy = jest.spyOn(service, 'quickCheck');

        await expect(
          service.kioskCheckIn({
            kioskToken: 'valid',
            phoneLast4: '0000', // 실제 번호(2222)와 불일치 -> 임의 studentId 조작 시도
            studentId: 100,
            classId: 1,
            type: QuickCheckType.CHECK_IN,
          }),
        ).rejects.toThrow(NotFoundException);
        expect(quickCheckSpy).not.toHaveBeenCalled();
      });
    });

    describe('generateKioskToken', () => {
      it('64자 이하의 새 토큰을 생성해 academy에 저장하고 반환한다', async () => {
        prisma.academy.update.mockResolvedValue({
          id: 10,
          kioskToken: 'new-token',
        });

        const result = await service.generateKioskToken(10);

        expect(prisma.academy.update).toHaveBeenCalledWith({
          where: { id: 10 },
          data: { kioskToken: expect.any(String) },
        });
        expect(result.kioskToken).toHaveLength(48);
      });
    });
  });
});
