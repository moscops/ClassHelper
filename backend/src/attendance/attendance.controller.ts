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
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { QuickCheckDto } from './dto/quick-check.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { AttendanceRosterQueryDto } from './dto/attendance-roster-query.dto';
import { AttendanceStatsQueryDto } from './dto/attendance-stats-query.dto';
import { UpdateMakeupDto } from './dto/update-makeup.dto';
import {
  AttendanceResponseDto,
  PaginatedAttendanceResponseDto,
  ClassDailyRosterResponseDto,
} from './dto/attendance-response.dto';
import { AttendanceStatsResponseDto } from './dto/attendance-stats-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('03. 출결 관리 (Attendance)')
@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('record')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({
    summary: '단일 학생 출결 등록 및 수정 (Upsert)',
    description: '특정 학생의 일별 출결 상태(출석, 결석, 지각, 조퇴), 등/하원 시각, 사유를 등록하거나 수정합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '출결 기록 성공',
    type: AttendanceResponseDto,
  })
  async recordAttendance(
    @CurrentUser('academyId') academyId: number,
    @Body() dto: RecordAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.recordAttendance(academyId, dto);
  }

  @Post('batch')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({
    summary: '반 전체 1초 일괄 출결 체크 (Batch Upsert)',
    description: '특정 수업 반의 전체 수강생 출결 상태를 한 번의 터치로 일괄 등록 및 갱신합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '일괄 출결 처리 성공',
    type: [AttendanceResponseDto],
  })
  async batchRecordAttendance(
    @CurrentUser('academyId') academyId: number,
    @Body() dto: BatchAttendanceDto,
  ): Promise<AttendanceResponseDto[]> {
    return this.attendanceService.batchRecordAttendance(academyId, dto);
  }

  @Post('quick-check')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({
    summary: '1초 빠른 원터치 등원/하원 체크',
    description: '학생의 등원 또는 하원을 1초 만에 원터치로 체크하여 시각을 자동 기록합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '원터치 출결 체크 성공',
    type: AttendanceResponseDto,
  })
  async quickCheck(
    @CurrentUser('academyId') academyId: number,
    @Body() dto: QuickCheckDto,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.quickCheck(academyId, dto);
  }

  @Get('roster')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({
    summary: '특정 반/일자의 전체 수강생 일별 출결 현황판',
    description: '해당 반의 수강생 전체 목록과 당일 출결 기록(미입력 학생 포함) 및 요약 통계를 함께 반환합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '반 일별 출결 현황판 조회 성공',
    type: ClassDailyRosterResponseDto,
  })
  async getClassDailyRoster(
    @CurrentUser('academyId') academyId: number,
    @Query() queryDto: AttendanceRosterQueryDto,
  ): Promise<ClassDailyRosterResponseDto> {
    return this.attendanceService.getClassDailyRoster(academyId, queryDto);
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: '출결 통계 및 요약 분석',
    description: '지정 기간 동안의 출석률, 결석/지각/조퇴 건수 및 일자별 통계 추이를 조회합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '출결 통계 조회 성공',
    type: AttendanceStatsResponseDto,
  })
  async getStats(
    @CurrentUser('academyId') academyId: number,
    @Query() queryDto: AttendanceStatsQueryDto,
  ): Promise<AttendanceStatsResponseDto> {
    return this.attendanceService.getStats(academyId, queryDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({
    summary: '출결 내역 다차원 검색 및 목록 조회 (페이지네이션)',
    description: '반, 학생, 일자 범위, 출결 상태, 보강 필요 여부 등 다양한 조건으로 출결 기록을 조회합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '출결 목록 조회 성공',
    type: PaginatedAttendanceResponseDto,
  })
  async getAttendances(
    @CurrentUser('academyId') academyId: number,
    @Query() queryDto: QueryAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    return this.attendanceService.getAttendances(academyId, queryDto);
  }

  @Patch(':id/makeup')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: '보강 수업(Makeup) 대상 지정 및 완료 처리',
    description: '결석/지각 학생에 대한 보강 필요 여부 및 보강 완료 여부를 업데이트합니다.',
  })
  @ApiParam({ name: 'id', description: '출결 기록 ID', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '보강 상태 수정 성공',
    type: AttendanceResponseDto,
  })
  async updateMakeup(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMakeupDto,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.updateMakeup(academyId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '출결 기록 삭제',
    description: '특정 출결 기록을 삭제합니다. (원장, 실장 전용)',
  })
  @ApiParam({ name: 'id', description: '출결 기록 ID', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '출결 기록 삭제 성공',
  })
  async deleteAttendance(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean; message: string }> {
    return this.attendanceService.deleteAttendance(academyId, id);
  }
}
