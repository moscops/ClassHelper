import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  EnrollmentStatus,
  NotificationType,
  NotificationChannel,
} from '@prisma/client';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { ClassLogsService } from '../class-logs/class-logs.service';
import { ClassesService } from '../classes/classes.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;
  let attendanceService: any;
  let classLogsService: any;
  let classesService: any;
  let notificationsService: any;

  const mockStudent = {
    id: 1,
    academyId: 10,
    name: '김민준',
    parentPhone: '010-1234-5678',
  };

  const mockAttendanceStats = {
    totalDays: 20,
    presentCount: 18,
    absentCount: 1,
    lateCount: 1,
    earlyLeaveCount: 0,
    attendanceRate: 90.0,
  };

  const mockHomeworkStats = {
    totalAssignments: 10,
    completedAssignments: 8,
    completionRate: 80.0,
    averageScore: 92.5,
  };

  beforeEach(async () => {
    prisma = {
      student: { findFirst: jest.fn() },
      class: { findFirst: jest.fn() },
    };
    attendanceService = {
      getStudentAttendanceStats: jest
        .fn()
        .mockResolvedValue(mockAttendanceStats),
    };
    classLogsService = {
      getStudentHomeworkStats: jest.fn().mockResolvedValue(mockHomeworkStats),
    };
    classesService = {
      getEnrolledStudents: jest.fn(),
    };
    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({ id: 101 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: ClassLogsService, useValue: classLogsService },
        { provide: ClassesService, useValue: classesService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('generateReport', () => {
    it('학생을 찾을 수 없으면 NotFoundException 발생', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.generateReport(10, 999, '2026-09-01', '2026-09-30'),
      ).rejects.toThrow(NotFoundException);
    });

    it('출결/과제 통계를 조합해 리포트와 메시지 본문을 생성', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);

      const result = await service.generateReport(
        10,
        1,
        '2026-09-01',
        '2026-09-30',
      );

      expect(attendanceService.getStudentAttendanceStats).toHaveBeenCalledWith(
        10,
        1,
        '2026-09-01',
        '2026-09-30',
      );
      expect(result.attendance).toEqual(mockAttendanceStats);
      expect(result.homework).toEqual(mockHomeworkStats);
      expect(result.message).toContain('김민준');
      expect(result.message).toContain('90');
      expect(result.message).toContain('92.5점');
    });

    it('평균 점수가 없으면 점수 줄을 생략', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      classLogsService.getStudentHomeworkStats.mockResolvedValue({
        ...mockHomeworkStats,
        averageScore: null,
      });

      const result = await service.generateReport(
        10,
        1,
        '2026-09-01',
        '2026-09-30',
      );

      expect(result.message).not.toContain('평균 점수');
    });
  });

  describe('sendStudentReport', () => {
    it('리포트 생성 후 카카오 알림톡으로 발송', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);

      const result = await service.sendStudentReport(
        10,
        1,
        '2026-09-01',
        '2026-09-30',
      );

      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          studentId: 1,
          type: NotificationType.STUDENT_REPORT,
          channel: NotificationChannel.KAKAO,
          targetPhone: '010-1234-5678',
        }),
      );
      expect(result.sentTo).toBe('010-1234-5678');
      expect(result.notificationId).toBe(101);
    });
  });

  describe('sendClassReports', () => {
    it('반을 찾을 수 없으면 NotFoundException 발생', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.sendClassReports(10, 999, '2026-09-01', '2026-09-30'),
      ).rejects.toThrow(NotFoundException);
    });

    it('재원생 전원에게 발송하고, 한 명 실패해도 나머지는 계속 발송', async () => {
      prisma.class.findFirst.mockResolvedValue({ name: '중등 수학 심화반' });
      classesService.getEnrolledStudents.mockResolvedValue([
        { student: { id: 1, name: '김민준' } },
        { student: { id: 2, name: '이서연' } },
      ]);
      prisma.student.findFirst
        .mockResolvedValueOnce(mockStudent) // student 1: generateReport
        .mockResolvedValueOnce(mockStudent) // student 1: parentPhone lookup
        .mockResolvedValueOnce(null); // student 2: generateReport -> throws

      const result = await service.sendClassReports(
        10,
        3,
        '2026-09-01',
        '2026-09-30',
      );

      expect(classesService.getEnrolledStudents).toHaveBeenCalledWith(
        10,
        3,
        EnrollmentStatus.ENROLLED,
      );
      expect(result.totalStudents).toBe(2);
      expect(result.sentCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failed[0].studentId).toBe(2);
    });
  });
});
