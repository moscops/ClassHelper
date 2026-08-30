import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EnrollmentStatus, UserRole } from '@prisma/client';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { QueryClassDto } from './dto/query-class.dto';
import {
  ClassResponseDto,
  PaginatedClassResponseDto,
} from './dto/class-response.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Classes & Enrollments (반 개설 및 수강생 관리)')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // ==========================================
  // 1. 수업 반(Class) 관리 API
  // ==========================================

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '수업 반 신규 개설',
    description:
      '과목, 학년, 담당 강사, 시간표, 정원, 월 수강료를 지정하여 새로운 반을 개설합니다. (원장, 실장 전용)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '반 개설 성공',
    type: ClassResponseDto,
  })
  async createClass(
    @CurrentUser('academyId') academyId: number,
    @Body() dto: CreateClassDto,
  ): Promise<ClassResponseDto> {
    return this.classesService.createClass(academyId, dto);
  }

  @Get()
  @ApiOperation({
    summary: '수업 반 목록 검색 및 페이징 조회',
    description:
      '반 이름, 과목, 강사, 상태별 필터링 및 현재 수강생 수 집계를 제공합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '반 목록 조회 성공',
    type: PaginatedClassResponseDto,
  })
  async findAllClasses(
    @CurrentUser('academyId') academyId: number,
    @Query() query: QueryClassDto,
  ): Promise<PaginatedClassResponseDto> {
    return this.classesService.findAllClasses(academyId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '수업 반 상세 정보 및 수강생 명단 조회',
    description:
      '반 기본 정보와 현재 수강 중인 학생들의 목록을 함께 조회합니다.',
  })
  @ApiParam({ name: 'id', description: '수업 반 ID', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '반 상세 조회 성공',
  })
  async findClassById(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.classesService.findClassById(academyId, id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '수업 반 정보 수정',
    description:
      '반 명칭, 시간표, 담당 강사, 정원, 수강료, 운영 상태 등을 수정합니다.',
  })
  @ApiParam({ name: 'id', description: '수업 반 ID', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '반 정보 수정 성공',
    type: ClassResponseDto,
  })
  async updateClass(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
  ): Promise<ClassResponseDto> {
    return this.classesService.updateClass(academyId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({
    summary: '수업 반 삭제',
    description: '수업 반을 완전히 삭제합니다. (원장님 전용)',
  })
  @ApiParam({ name: 'id', description: '수업 반 ID', example: 1 })
  async deleteClass(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.classesService.deleteClass(academyId, id);
  }

  // ==========================================
  // 2. 수강생 배정(Enrollment) 관리 API
  // ==========================================

  @Post(':classId/enrollments')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: '특정 반에 원생 수강 등록 (반 배정)',
    description:
      '원생을 특정 반에 배정합니다. 정원 초과 여부와 중복 등록 여부를 자동 검증합니다.',
  })
  @ApiParam({ name: 'classId', description: '수업 반 ID', example: 1 })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '수강 등록 성공',
    type: EnrollmentResponseDto,
  })
  async enrollStudent(
    @CurrentUser('academyId') academyId: number,
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: CreateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    return this.classesService.enrollStudent(academyId, classId, dto);
  }

  @Get(':classId/enrollments')
  @ApiOperation({
    summary: '특정 반의 수강생 목록 조회',
    description:
      '해당 반에 배정된 학생들의 명단, 연락처, 수강 상태를 조회합니다.',
  })
  @ApiParam({ name: 'classId', description: '수업 반 ID', example: 1 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: EnrollmentStatus,
    description: '수강 상태 필터',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '수강생 목록 조회 성공',
    type: [EnrollmentResponseDto],
  })
  async getEnrolledStudents(
    @CurrentUser('academyId') academyId: number,
    @Param('classId', ParseIntPipe) classId: number,
    @Query('status') status?: EnrollmentStatus,
  ): Promise<EnrollmentResponseDto[]> {
    return this.classesService.getEnrolledStudents(academyId, classId, status);
  }

  @Patch('enrollments/:enrollmentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '수강생 수강 상태 변경 (종강, 중도하차/퇴반, 일시정지)',
  })
  @ApiParam({ name: 'enrollmentId', description: '수강 이력 ID', example: 1 })
  async updateEnrollment(
    @CurrentUser('academyId') academyId: number,
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
    @Body() dto: UpdateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    return this.classesService.updateEnrollment(academyId, enrollmentId, dto);
  }

  @Delete('enrollments/:enrollmentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '수강 등록 취소/삭제',
  })
  @ApiParam({ name: 'enrollmentId', description: '수강 이력 ID', example: 1 })
  async removeEnrollment(
    @CurrentUser('academyId') academyId: number,
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
  ) {
    return this.classesService.removeEnrollment(academyId, enrollmentId);
  }

  @Get('students/:studentId/enrollments')
  @ApiOperation({
    summary: '특정 학생의 수강 중인 반 목록 조회',
  })
  @ApiParam({ name: 'studentId', description: '원생 Student ID', example: 1 })
  async getStudentEnrollments(
    @CurrentUser('academyId') academyId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.classesService.getStudentEnrollments(academyId, studentId);
  }
}
