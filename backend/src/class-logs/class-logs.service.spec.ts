import { Test, TestingModule } from '@nestjs/testing';
import { ClassLogsService } from './class-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { HomeworkStatus } from '@prisma/client';

describe('ClassLogsService', () => {
  let service: ClassLogsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    class: {
      findFirst: jest.fn(),
    },
    classLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    homeworkSubmission: {
      createMany: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    student: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassLogsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ClassLogsService>(ClassLogsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if class is not found', async () => {
      mockPrismaService.class.findFirst.mockResolvedValue(null);

      await expect(
        service.create(1, 2, {
          classId: 99,
          date: '2026-08-30',
          curriculum: '수학 1단원',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a class log and auto-create submissions for enrolled students', async () => {
      const mockClass = {
        id: 1,
        academyId: 1,
        name: '중등 수학 심화반',
        enrollments: [{ studentId: 10 }, { studentId: 11 }],
      };
      mockPrismaService.class.findFirst.mockResolvedValue(mockClass);

      const createdLog = {
        id: 100,
        academyId: 1,
        classId: 1,
        teacherId: 2,
        date: new Date('2026-08-30'),
        curriculum: '수학 1단원 다항식',
        lessonContent: '공식 암기',
        homework: '워크북 p.10',
        notes: null,
      };
      mockPrismaService.classLog.create.mockResolvedValue(createdLog);
      mockPrismaService.homeworkSubmission.createMany.mockResolvedValue({ count: 2 });

      mockPrismaService.classLog.findUniqueOrThrow.mockResolvedValue({
        ...createdLog,
        class: mockClass,
        teacher: { id: 2, name: '강사A', email: 'teacher@test.com' },
        homeworkSubmissions: [
          {
            id: 1,
            classLogId: 100,
            studentId: 10,
            status: HomeworkStatus.NOT_SUBMITTED,
            score: null,
            feedback: null,
            student: { id: 10, name: '김원생', grade: '중2', parentPhone: '010-1234-5678' },
          },
          {
            id: 2,
            classLogId: 100,
            studentId: 11,
            status: HomeworkStatus.NOT_SUBMITTED,
            score: null,
            feedback: null,
            student: { id: 11, name: '이원생', grade: '중2', parentPhone: '010-9876-5432' },
          },
        ],
      });

      const result = await service.create(1, 2, {
        classId: 1,
        date: '2026-08-30',
        curriculum: '수학 1단원 다항식',
        lessonContent: '공식 암기',
        homework: '워크북 p.10',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(100);
      expect(result.curriculum).toBe('수학 1단원 다항식');
      expect(result.totalStudents).toBe(2);
      expect(result.notSubmittedCount).toBe(2);
      expect(result.completedCount).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should return paginated class logs with statistics', async () => {
      mockPrismaService.classLog.count.mockResolvedValue(1);
      mockPrismaService.classLog.findMany.mockResolvedValue([
        {
          id: 100,
          academyId: 1,
          classId: 1,
          teacherId: 2,
          date: new Date('2026-08-30'),
          curriculum: '수학 1단원',
          lessonContent: '수업 내용',
          homework: '과제',
          class: { id: 1, name: '수학반' },
          teacher: { id: 2, name: '홍길동' },
          homeworkSubmissions: [
            {
              id: 1,
              status: HomeworkStatus.COMPLETED,
              score: 100,
              student: { id: 10, name: '김원생' },
            },
          ],
        },
      ]);

      const result = await service.findAll(1, { page: 1, limit: 10 });
      expect(result.total).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].completionRate).toBe(100);
      expect(result.items[0].averageScore).toBe(100);
    });
  });

  describe('getStudentHomeworkHistory', () => {
    it('should return student cumulative homework history and rate', async () => {
      mockPrismaService.student.findFirst.mockResolvedValue({ id: 10, name: '김민준' });
      mockPrismaService.homeworkSubmission.findMany.mockResolvedValue([
        {
          id: 1,
          classLogId: 100,
          status: HomeworkStatus.COMPLETED,
          score: 95,
          feedback: '잘함',
          classLog: {
            date: new Date('2026-08-30'),
            curriculum: '수학',
            homework: '숙제',
            class: { name: '수학반' },
            teacher: { name: '선생님' },
          },
        },
      ]);

      const result = await service.getStudentHomeworkHistory(1, 10);
      expect(result.studentName).toBe('김민준');
      expect(result.totalAssignments).toBe(1);
      expect(result.completedAssignments).toBe(1);
      expect(result.completionRate).toBe(100);
      expect(result.averageScore).toBe(95);
    });
  });
});
