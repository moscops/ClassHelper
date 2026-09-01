import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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
      bulkImport: jest.fn().mockResolvedValue({
        totalRows: 1,
        createdCount: 1,
        skippedCount: 0,
        failedCount: 0,
        created: [mockStudent],
        skipped: [],
        failed: [],
      }),
      getBulkImportTemplate: jest.fn().mockReturnValue(Buffer.from('csv')),
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

  describe('bulkImport', () => {
    const csvFile = {
      buffer: Buffer.from('이름,학부모연락처\n홍길동,010-1111-2222'),
      mimetype: 'text/csv',
      originalname: 'students.csv',
    } as Express.Multer.File;

    it('CSV 파일 업로드 시 서비스로 버퍼 전달', async () => {
      const result = await controller.bulkImport(10, csvFile);
      expect(service.bulkImport).toHaveBeenCalledWith(10, csvFile.buffer);
      expect(result.createdCount).toBe(1);
    });

    it('파일이 없으면 BadRequestException 발생', async () => {
      await expect(
        controller.bulkImport(10, undefined as unknown as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
      expect(service.bulkImport).not.toHaveBeenCalled();
    });

    it('CSV가 아닌 파일이면 BadRequestException 발생', async () => {
      const badFile = {
        buffer: Buffer.from('not a csv'),
        mimetype: 'application/pdf',
        originalname: 'students.pdf',
      } as Express.Multer.File;

      await expect(controller.bulkImport(10, badFile)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.bulkImport).not.toHaveBeenCalled();
    });
  });

  describe('downloadBulkImportTemplate', () => {
    it('CSV 템플릿을 응답으로 전송', () => {
      const res = { set: jest.fn(), send: jest.fn() } as any;

      controller.downloadBulkImportTemplate(res);

      expect(service.getBulkImportTemplate).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': expect.stringContaining('text/csv'),
        }),
      );
      expect(res.send).toHaveBeenCalledWith(Buffer.from('csv'));
    });
  });
});
