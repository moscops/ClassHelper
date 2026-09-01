import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StudentStatus, Gender, EnrollmentStatus } from '@prisma/client';
import { StudentsService } from './students.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: any;

  const mockStudent = {
    id: 1,
    academyId: 10,
    name: '홍길동',
    gender: Gender.MALE,
    birthDate: new Date('2012-05-15'),
    schoolName: '서울초등학교',
    grade: '초6',
    studentPhone: '010-1111-2222',
    parentPhone: '010-3333-4444',
    parentName: '홍판서',
    parentRelationship: '모',
    status: StudentStatus.ACTIVE,
    enrolledAt: new Date('2026-08-18'),
    dischargedAt: null,
    memo: '특이사항 메모',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      student: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  describe('create', () => {
    it('원생 등록 성공 시 생성된 원생 정보 반환', async () => {
      prisma.student.create.mockResolvedValue(mockStudent);

      const result = await service.create(10, {
        name: '홍길동',
        gender: Gender.MALE,
        birthDate: '2012-05-15',
        schoolName: '서울초등학교',
        grade: '초6',
        studentPhone: '010-1111-2222',
        parentPhone: '010-3333-4444',
      });

      expect(prisma.student.create).toHaveBeenCalled();
      expect(result.id).toBe(1);
      expect(result.name).toBe('홍길동');
    });
  });

  describe('findAll', () => {
    it('페이징 및 필터링된 원생 목록 반환', async () => {
      prisma.student.count.mockResolvedValue(1);
      prisma.student.findMany.mockResolvedValue([mockStudent]);

      const result = await service.findAll(10, {
        page: 1,
        limit: 10,
        search: '홍길동',
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('원생 상세 조회 및 수강 중인 반 목록 반환', async () => {
      const studentWithEnrollments = {
        ...mockStudent,
        enrollments: [
          {
            id: 100,
            status: EnrollmentStatus.ENROLLED,
            startDate: new Date('2026-08-01'),
            class: {
              id: 5,
              name: '중등 수학 심화반',
              subject: '수학',
              teacher: { name: '이강사' },
            },
          },
        ],
      };

      prisma.student.findFirst.mockResolvedValue(studentWithEnrollments);

      const result = await service.findOne(10, 1);

      expect(result.id).toBe(1);
      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].className).toBe('중등 수학 심화반');
      expect(result.classes[0].teacherName).toBe('이강사');
    });

    it('존재하지 않는 학생일 때 NotFoundException 발생', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(service.findOne(10, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('원생 정보 수정 성공 시 업데이트된 정보 반환', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      const updated = { ...mockStudent, grade: '중1' };
      prisma.student.update.mockResolvedValue(updated);

      const result = await service.update(10, 1, { grade: '중1' });

      expect(result.grade).toBe('중1');
    });
  });

  describe('updateStatus', () => {
    it('원생 상태 변경(퇴원 처리) 시 퇴원일자 업데이트', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      const discharged = {
        ...mockStudent,
        status: StudentStatus.DISCHARGED,
        dischargedAt: new Date('2026-08-31'),
      };
      prisma.student.update.mockResolvedValue(discharged);

      const result = await service.updateStatus(10, 1, {
        status: StudentStatus.DISCHARGED,
        dischargedAt: '2026-08-31',
      });

      expect(result.status).toBe(StudentStatus.DISCHARGED);
      expect(result.dischargedAt).toBeDefined();
    });
  });

  describe('remove', () => {
    it('원생 삭제 성공', async () => {
      prisma.student.findFirst.mockResolvedValue(mockStudent);
      prisma.student.delete.mockResolvedValue(mockStudent);

      const result = await service.remove(10, 1);

      expect(result.success).toBe(true);
      expect(prisma.student.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('bulkImport', () => {
    let idCounter: number;

    beforeEach(() => {
      idCounter = 100;
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: idCounter++, ...data }),
      );
      prisma.$transaction.mockImplementation((ops: Promise<any>[]) =>
        Promise.all(ops),
      );
    });

    const csv = (rows: string) =>
      Buffer.from('이름,성별,학부모연락처,재원상태\n' + rows);

    it('전부 유효한 행은 모두 등록됨', async () => {
      const result = await service.bulkImport(
        10,
        csv('홍길동,남,010-1111-2222,재원\n김영희,여,010-3333-4444,재원'),
      );

      expect(result.totalRows).toBe(2);
      expect(result.createdCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(prisma.student.create).toHaveBeenCalledTimes(2);
    });

    it('필수값(학부모 연락처) 누락 행은 실패 목록에 기록되고 나머지는 등록됨', async () => {
      const result = await service.bulkImport(
        10,
        csv('홍길동,남,,재원\n김영희,여,010-3333-4444,재원'),
      );

      expect(result.createdCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.failed[0].errors).toContain(
        '학부모 연락처를 입력해주세요.',
      );
    });

    it('파일 내 중복 행(이름+학부모 연락처 동일)은 두 번째부터 건너뜀', async () => {
      const result = await service.bulkImport(
        10,
        csv('홍길동,남,010-1111-2222,재원\n홍길동,남,010-1111-2222,재원'),
      );

      expect(result.createdCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.skipped[0].reason).toContain('이미 등록');
    });

    it('DB에 이미 존재하는 원생과 동일한 행은 건너뜀', async () => {
      prisma.student.findMany.mockResolvedValue([
        { name: '홍길동', parentPhone: '010-1111-2222' },
      ]);

      const result = await service.bulkImport(
        10,
        csv('홍길동,남,010-1111-2222,재원'),
      );

      expect(result.createdCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(prisma.student.create).not.toHaveBeenCalled();
    });

    it('한글 재원 상태/성별 값을 Enum으로 변환', async () => {
      await service.bulkImport(10, csv('홍길동,남,010-1111-2222,휴원'));

      expect(prisma.student.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gender: Gender.MALE,
            status: StudentStatus.ON_LEAVE,
          }),
        }),
      );
    });

    it('인식할 수 없는 재원 상태 값은 실패로 기록', async () => {
      const result = await service.bulkImport(
        10,
        csv('홍길동,남,010-1111-2222,알수없음'),
      );

      expect(result.failedCount).toBe(1);
      expect(result.failed[0].errors[0]).toContain('재원 상태');
    });

    it('빈 CSV는 BadRequestException 발생', async () => {
      await expect(
        service.bulkImport(10, Buffer.from('이름,학부모연락처\n')),
      ).rejects.toThrow(BadRequestException);
    });

    it('최대 행 수(2000)를 초과하면 BadRequestException 발생', async () => {
      const header = '이름,학부모연락처\n';
      const rows = Array.from(
        { length: 2001 },
        (_, i) => `학생${i},010-0000-${String(i).padStart(4, '0')}`,
      ).join('\n');

      await expect(
        service.bulkImport(10, Buffer.from(header + rows)),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
