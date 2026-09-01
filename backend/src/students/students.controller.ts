import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import {
  StudentResponseDto,
  StudentDetailResponseDto,
  PaginatedStudentResponseDto,
} from './dto/student-response.dto';
import { BulkImportResultDto } from './dto/bulk-import-result.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Students (원생 관리)')
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({
    summary: '원생 신규 등록',
    description:
      '현재 소속 학원에 새로운 원생을 등록합니다. (원장, 실장, 강사, 조교 가능)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '원생 등록 성공',
    type: StudentResponseDto,
  })
  async create(
    @CurrentUser('academyId') academyId: number,
    @Body() dto: CreateStudentDto,
  ): Promise<StudentResponseDto> {
    return this.studentsService.create(academyId, dto);
  }

  @Get()
  @ApiOperation({
    summary: '원생 목록 검색 및 페이징 조회',
    description:
      '학생 이름, 연락처 검색, 학년 필터, 재원 상태(ACTIVE/ON_LEAVE/DISCHARGED) 필터 및 페이징 조회를 제공합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '원생 목록 조회 성공',
    type: PaginatedStudentResponseDto,
  })
  async findAll(
    @CurrentUser('academyId') academyId: number,
    @Query() query: QueryStudentDto,
  ): Promise<PaginatedStudentResponseDto> {
    return this.studentsService.findAll(academyId, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: '원생 ID', example: 1 })
  @ApiOperation({
    summary: '원생 상세 조회',
    description:
      '특정 원생의 기본 정보와 현재 수강 중인 반 목록을 함께 조회합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '원생 상세 조회 성공',
    type: StudentDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '존재하지 않는 원생 ID',
  })
  async findOne(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StudentDetailResponseDto> {
    return this.studentsService.findOne(academyId, id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiParam({ name: 'id', description: '원생 ID', example: 1 })
  @ApiOperation({
    summary: '원생 정보 수정',
    description: '원생의 기본 인적사항, 학부모 연락처, 메모 등을 수정합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '원생 정보 수정 성공',
    type: StudentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '존재하지 않는 원생 ID',
  })
  async update(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    return this.studentsService.update(academyId, id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'id', description: '원생 ID', example: 1 })
  @ApiOperation({
    summary: '원생 재원 상태 변경 (재원/휴원/퇴원)',
    description:
      '원생의 상태를 변경합니다. (퇴원 시 퇴원일자 자동 기록 가능, 원장/실장 전용)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '원생 상태 변경 성공',
    type: StudentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '존재하지 않는 원생 ID',
  })
  async updateStatus(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentStatusDto,
  ): Promise<StudentResponseDto> {
    return this.studentsService.updateStatus(academyId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiParam({ name: 'id', description: '원생 ID', example: 1 })
  @ApiOperation({
    summary: '원생 삭제 (원장/실장 전용)',
    description: '원생 정보를 데이터베이스에서 삭제합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '원생 삭제 성공',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '존재하지 않는 원생 ID',
  })
  async remove(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean; message: string }> {
    return this.studentsService.remove(academyId, id);
  }

  @Get('bulk-import/template')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '원생 CSV 일괄 등록 템플릿 다운로드',
    description: '헤더 및 예시 1행이 포함된 CSV 템플릿 파일을 반환합니다.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: '템플릿 CSV 다운로드' })
  downloadBulkImportTemplate(@Res() res: Response): void {
    const buffer = this.studentsService.getBulkImportTemplate();
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="students_import_template.csv"',
    });
    res.send(buffer);
  }

  @Post('bulk-import')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: '원생 CSV 일괄 등록',
    description:
      'CSV 파일을 업로드하여 여러 원생을 한 번에 등록합니다. 검증 실패 행은 건너뛰고, ' +
      '이미 등록된(이름+학부모 연락처 동일) 원생은 중복 생성하지 않습니다. (원장/실장 전용)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '일괄 등록 처리 결과 (성공/건너뜀/실패 상세 포함)',
    type: BulkImportResultDto,
  })
  async bulkImport(
    @CurrentUser('academyId') academyId: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<BulkImportResultDto> {
    if (!file) {
      throw new BadRequestException('업로드할 CSV 파일을 선택해주세요.');
    }
    const isCsv =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      throw new BadRequestException('CSV 파일만 업로드할 수 있습니다.');
    }
    return this.studentsService.bulkImport(academyId, file.buffer);
  }
}
