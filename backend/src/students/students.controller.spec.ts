import { Test, TestingModule } from '@nestjs/testing';
import { StudentStatus, Gender } from '@prisma/client';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

describe('StudentsController', () => {
  let controller: StudentsController;
  let service: any;

  const mockStudent = {
    id: 1,
    academyId: 10,
    name: '홍길동',
    gender: Gender.MALE,
    parentPhone: '010-3333-4444',
    status: StudentStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(mockStudent),
      findAll: jest.fn().mockResolvedValue({
        items: [mockStudent],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
      findOne: jest.fn().mockResolvedValue({ ...mockStudent, classes: [] }),
      update: jest.fn().mockResolvedValue(mockStudent),
      updateStatus: jest.fn().mockResolvedValue(mockStudent),
      remove: jest.fn().mockResolvedValue({
        success: true,
        message: '원생 정보가 성공적으로 삭제되었습니다.',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [{ provide: StudentsService, useValue: service }],
    }).compile();

    controller = module.get<StudentsController>(StudentsController);
  });

  it('create 호출 시 서비스로 academyId와 DTO 전달', async () => {
    const dto = { name: '홍길동', parentPhone: '010-3333-4444' };
    const result = await controller.create(10, dto);
    expect(service.create).toHaveBeenCalledWith(10, dto);
    expect(result).toEqual(mockStudent);
  });

  it('findAll 호출 시 검색 및 페이징 쿼리 전달', async () => {
    const query = { search: '홍길동', page: 1, limit: 20 };
    const result = await controller.findAll(10, query);
    expect(service.findAll).toHaveBeenCalledWith(10, query);
    expect(result.items).toHaveLength(1);
  });

  it('findOne 호출 시 원생 ID 전달', async () => {
    const result = await controller.findOne(10, 1);
    expect(service.findOne).toHaveBeenCalledWith(10, 1);
    expect(result.id).toBe(1);
  });

  it('update 호출 시 DTO 전달', async () => {
    const dto = { name: '홍길순' };
    const result = await controller.update(10, 1, dto);
    expect(service.update).toHaveBeenCalledWith(10, 1, dto);
    expect(result).toEqual(mockStudent);
  });

  it('updateStatus 호출 시 상태 DTO 전달', async () => {
    const dto = { status: StudentStatus.ON_LEAVE };
    const result = await controller.updateStatus(10, 1, dto);
    expect(service.updateStatus).toHaveBeenCalledWith(10, 1, dto);
    expect(result).toEqual(mockStudent);
  });

  it('remove 호출 시 삭제 서비스 호출', async () => {
    const result = await controller.remove(10, 1);
    expect(service.remove).toHaveBeenCalledWith(10, 1);
    expect(result.success).toBe(true);
  });
});
