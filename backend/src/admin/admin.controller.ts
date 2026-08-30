import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateAcademyStatusDto } from './dto/update-academy-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AcademyStatus, UserRole } from '@prisma/client';

@ApiTags('Admin (플랫폼 관리자)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({
    summary: '플랫폼 전체 요약 통계 조회 (학원 수, 원생 수, 오늘 출결 등)',
  })
  @ApiResponse({ status: 200, description: '플랫폼 통계 요약 반환' })
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('academies')
  @ApiOperation({ summary: '전체 입점 학원 목록 및 원장님/통계 조회' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: '학원명, 전화번호 검색어',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AcademyStatus,
    description: '학원 운영 상태 필터',
  })
  async getAcademies(
    @Query('search') search?: string,
    @Query('status') status?: AcademyStatus,
  ) {
    return this.adminService.getAcademies(search, status);
  }

  @Get('academies/:id')
  @ApiOperation({ summary: '특정 학원 상세 정보 조회' })
  async getAcademyDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getAcademyDetail(id);
  }

  @Patch('academies/:id/status')
  @ApiOperation({ summary: '학원 운영 상태 변경 (정상 / 일시정지 / 대기)' })
  async updateAcademyStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAcademyStatusDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    return this.adminService.updateAcademyStatus(
      user.userId,
      id,
      dto.status,
      dto.reason,
      ipAddress,
    );
  }

  @Get('audit-logs')
  @ApiOperation({ summary: '최근 플랫폼 관리자 작업 감사 로그 조회' })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  async getAuditLogs(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 30;
    return this.adminService.getAuditLogs(limitNum);
  }
}
