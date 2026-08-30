import { Test, TestingModule } from '@nestjs/testing';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { ClassStatus, EnrollmentStatus } from '@prisma/client';

describe('ClassesController', () => {
  let controller: ClassesController;
  let service: ClassesService;

  const mockClassesService = {
    createClass: jest.fn(),
    findAllClasses: jest.fn(),
    findClassById: jest.fn(),
    updateClass: jest.fn(),
    deleteClass: jest.fn(),
    enrollStudent: jest.fn(),
    getEnrolledStudents: jest.fn(),
    updateEnrollment: jest.fn(),
    removeEnrollment: jest.fn(),
    getStudentEnrollments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        {
          provide: ClassesService,
          useValue: mockClassesService,
        },
      ],
    }).compile();

    controller = module.get<ClassesController>(ClassesController);
    service = module.get<ClassesService>(ClassesService);
  });

  it('컨트롤러가 정의되어 있어야 함', () => {
    expect(controller).toBeDefined();
  });

  describe('createClass', () => {
    it('반 생성 성공', async () => {
      const dto = {
        name: '중등 수학 심화A반',
        subject: '수학',
      };
      const expected = { id: 1, name: '중등 수학 심화A반', academyId: 10 };
      mockClassesService.createClass.mockResolvedValue(expected);

      const result = await controller.createClass(10, dto);
      expect(result).toEqual(expected);
      expect(mockClassesService.createClass).toHaveBeenCalledWith(10, dto);
    });
  });

  describe('findAllClasses', () => {
    it('반 목록 조회', async () => {
      const expected = {
        items: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
      mockClassesService.findAllClasses.mockResolvedValue(expected);

      const result = await controller.findAllClasses(10, {
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(expected);
      expect(mockClassesService.findAllClasses).toHaveBeenCalledWith(10, {
        page: 1,
        limit: 20,
      });
    });
  });

  describe('enrollStudent', () => {
    it('원생 수강 등록', async () => {
      const dto = { studentId: 100 };
      const expected = {
        id: 1,
        studentId: 100,
        classId: 1,
        status: EnrollmentStatus.ENROLLED,
      };
      mockClassesService.enrollStudent.mockResolvedValue(expected);

      const result = await controller.enrollStudent(10, 1, dto);
      expect(result).toEqual(expected);
      expect(mockClassesService.enrollStudent).toHaveBeenCalledWith(10, 1, dto);
    });
  });
});
