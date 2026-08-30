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
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ClassLogsService } from './class-logs.service';
import { CreateClassLogDto } from './dto/create-class-log.dto';
import { UpdateClassLogDto } from './dto/update-class-log.dto';
import { QueryClassLogsDto } from './dto/query-class-logs.dto';
import { BatchUpdateHomeworkSubmissionsDto } from './dto/update-homework-submission.dto';
import {
  ClassLogResponseDto,
  PaginatedClassLogsResponseDto,
  StudentHomeworkHistoryResponseDto,
} from './dto/class-log-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('05. 수업 일지 및 과제 관리 (Class Logs & Homework)')
@Controller('class-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ClassLogsController {
  constructor(private readonly classLogsService: ClassLogsService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: '수업 일지 신규 작성',
    description:
      '각 반의 회차별 수업 내용, 진도 범위, 과제 공지를 기록하고 수강생들의 과제 초기 상태를 자동 생성합니다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '수업 일지 작성 성공',
    type: ClassLogResponseDto,
  })
  async create(
    @CurrentUser('academyId') academyId: number,
    @CurrentUser('userId') teacherId: number,
    @Body() dto: CreateClassLogDto,
  ): Promise<ClassLogResponseDto> {
    return this.classLogsService.create(academyId, teacherId, dto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STAFF,
  )
  @ApiOperation({
    summary: '수업 일지 목록 조회 (필터 및 페이징)',
    description:
      '학원 내 수업 일지 목록을 반별, 강사별, 일자 범위, 검색어로 필터링하여 페이징 조회합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '수업 일지 목록 조회 성공',
    type: PaginatedClassLogsResponseDto,
  })
  async findAll(
    @CurrentUser('academyId') academyId: number,
    @Query() query: QueryClassLogsDto,
  ): Promise<PaginatedClassLogsResponseDto> {
    return this.classLogsService.findAll(academyId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STAFF,
  )
  @ApiOperation({
    summary: '특정 수업 일지 상세 조회',
    description:
      '수업 일지의 상세 내용과 함께 해당 수업에 배정된 원생들의 과제 제출 상태 및 피드백 목록을 조회합니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '수업 일지 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '수업 일지 상세 조회 성공',
    type: ClassLogResponseDto,
  })
  async findOne(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ClassLogResponseDto> {
    return this.classLogsService.findOne(academyId, id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: '수업 일지 수정',
    description: '수업 진도, 핵심 내용, 과제 공지, 특이사항을 수정합니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '수업 일지 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '수업 일지 수정 성공',
    type: ClassLogResponseDto,
  })
  async update(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassLogDto,
  ): Promise<ClassLogResponseDto> {
    return this.classLogsService.update(academyId, id, dto);
  }

  @Delete(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: '수업 일지 삭제',
    description: '수업 일지와 연결된 과제 검사 이력을 삭제합니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '수업 일지 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '수업 일지 삭제 성공',
  })
  async remove(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.classLogsService.remove(academyId, id);
  }

  @Patch(':id/homework-submissions')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
  )
  @ApiOperation({
    summary: '원생별 과제 검사 및 피드백 일괄 수정',
    description:
      '수업 일지에 소속된 학생들의 과제 완성도(COMPLETED, INCOMPLETE, NOT_SUBMITTED, EXCUSED), 점수, 코멘트를 일괄 저장합니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '수업 일지 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '과제 평가 저장 성공',
    type: ClassLogResponseDto,
  })
  async updateHomeworkSubmissions(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BatchUpdateHomeworkSubmissionsDto,
  ): Promise<ClassLogResponseDto> {
    return this.classLogsService.updateHomeworkSubmissions(academyId, id, dto);
  }

  @Get('student/:studentId/history')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STAFF,
  )
  @ApiOperation({
    summary: '특정 원생의 누적 과제 이력 및 성취도 리포트 조회',
    description:
      '특정 원생의 과거 모든 수업 일지 과제 수행률, 평균 점수, 교재 진도별 피드백 히스토리를 조회합니다.',
  })
  @ApiParam({ name: 'studentId', example: 1, description: '원생 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '원생 과제 이력 조회 성공',
    type: StudentHomeworkHistoryResponseDto,
  })
  async getStudentHomeworkHistory(
    @CurrentUser('academyId') academyId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<StudentHomeworkHistoryResponseDto> {
    return this.classLogsService.getStudentHomeworkHistory(academyId, studentId);
  }
}
