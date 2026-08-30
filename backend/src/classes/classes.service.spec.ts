import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ClassStatus,
  EnrollmentStatus,
  StudentStatus,
  Gender,
} from '@prisma/client';
import { ClassesService } from './classes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClassesService', () => {
  let service: ClassesService;
  let prisma: any;

  const mockClass = {
    id: 1,
    academyId: 10,
    name: '중등 수학 심화A반',
    subject: '수학',
    targetGrade: '중2',
    teacherId: 2,
    schedule: '월/수/금 17:00-19:00',
    capacity: 15,
    monthlyFee: 350000,
    status: ClassStatus.ACTIVE,
    teacher: {
      id: 2,
      name: '이선생',
      email: 'teacher@classhelper.kr',
      phone: '010-1234-5678',
    },
    _count: {
      enrollments: 5,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStudent = {
    id: 100,
    academyId: 10,
    name: '김민준',
    gender: Gender.MALE,
    grade: '중2',
    schoolName: '대치중학교',
    studentPhone: '010-1111-2222',
    parentPhone: '010-3333-4444',
    parentName: '학부모',
    status: StudentStatus.ACTIVE,
  };

  const mockEnrollment = {
    id: 50,
    academyId: 10,
    studentId: 100,
    classId: 1,
    startDate: new Date('2026-09-01'),
    endDate: null,
    status: EnrollmentStatus.ENROLLED,
    student: mockStudent,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      class: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      student: {
        findFirst: jest.fn(),
      },
      enrollment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClassesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
  });

  describe('createClass', () => {
    it('반 신규 개설 성공 시 생성된 반 정보 반환', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 2, academyId: 10 });
      prisma.class.create.mockResolvedValue(mockClass);

      const result = await service.createClass(10, {
        name: '중등 수학 심화A반',
        subject: '수학',
        targetGrade: '중2',
        teacherId: 2,
        capacity: 15,
        monthlyFee: 350000,
      });

      expect(result.id).toBe(1);
      expect(result.name).toBe('중등 수학 심화A반');
      expect(result.monthlyFee).toBe(350000);
      expect(result.enrolledCount).toBe(5);
    });

    it('타 학원 소속 강사 배정 시 BadRequestException 발생', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createClass(10, {
          name: '중등 수학 심화A반',
          teacherId: 999,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllClasses', () => {
    it('학원 소속 반 목록과 페이징 메타정보 반환', async () => {
      prisma.class.count.mockResolvedValue(1);
      prisma.class.findMany.mockResolvedValue([mockClass]);

      const result = await service.findAllClasses(10, { page: 1, limit: 10 });

      expect(result.items.length).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('findClassById', () => {
    it('존재하지 않는 반 ID 조회 시 NotFoundException 발생', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(service.findClassById(10, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('enrollStudent', () => {
    it('수강 등록 성공 시 Enrollment 반환', async () => {
      prisma.class.findFirst.mockResolvedValue({
        ...mockClass,
        capacity: 15,
        _count: { enrollments: 5 },
      });
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.enrollment.findFirst.mockResolvedValue(null);
      prisma.enrollment.create.mockResolvedValue(mockEnrollment);

      const result = await service.enrollStudent(10, 1, {
        studentId: 100,
        startDate: '2026-09-01',
      });

      expect(result.id).toBe(50);
      expect(result.student.name).toBe('김민준');
      expect(result.status).toBe(EnrollmentStatus.ENROLLED);
    });

    it('정원 초과 시 BadRequestException 발생', async () => {
      prisma.class.findFirst.mockResolvedValue({
        ...mockClass,
        capacity: 5,
        _count: { enrollments: 5 },
      });

      await expect(
        service.enrollStudent(10, 1, { studentId: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('이미 수강 중인 경우 ConflictException 발생', async () => {
      prisma.class.findFirst.mockResolvedValue({
        ...mockClass,
        capacity: 15,
        _count: { enrollments: 5 },
      });
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.enrollment.findFirst.mockResolvedValue(mockEnrollment); // 이미 존재

      await expect(
        service.enrollStudent(10, 1, { studentId: 100 }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
