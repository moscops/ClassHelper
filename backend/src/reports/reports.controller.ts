import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import {
  StudentReportDto,
  SendReportResultDto,
  ClassReportSendResultDto,
} from './dto/report-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('07. 원생 리포트 (Reports)')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
@ApiBearerAuth('access-token')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('students/:id')
  @ApiOperation({
    summary: '원생 리포트 미리보기 (발송하지 않음)',
    description:
      '지정한 기간의 출결/과제 통계와 발송될 메시지 본문을 미리 확인합니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '원생 ID' })
  @ApiQuery({ name: 'periodStart', example: '2026-09-01' })
  @ApiQuery({ name: 'periodEnd', example: '2026-09-30' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '리포트 미리보기 조회 성공',
    type: StudentReportDto,
  })
  async previewStudentReport(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ): Promise<StudentReportDto> {
    return this.reportsService.generateReport(
      academyId,
      id,
      periodStart,
      periodEnd,
    );
  }

  @Post('students/:id/send')
  @ApiOperation({
    summary: '원생 리포트 생성 및 카카오 발송',
    description:
      '지정한 기간의 출결/과제 리포트를 생성하여 학부모에게 카카오 알림톡으로 발송합니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '원생 ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '리포트 발송 성공',
    type: SendReportResultDto,
  })
  async sendStudentReport(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateReportDto,
  ): Promise<SendReportResultDto> {
    return this.reportsService.sendStudentReport(
      academyId,
      id,
      dto.periodStart,
      dto.periodEnd,
      dto.customMessage,
    );
  }

  @Post('classes/:id/send')
  @ApiOperation({
    summary: '반 전체 원생 리포트 일괄 발송',
    description:
      '반에 재원 중(ENROLLED)인 모든 원생에게 리포트를 생성해 카카오로 발송합니다. 일부 발송 실패가 나머지를 막지 않습니다(부분 성공).',
  })
  @ApiParam({ name: 'id', example: 3, description: '수업 반 ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '반 리포트 일괄 발송 처리 결과',
    type: ClassReportSendResultDto,
  })
  async sendClassReports(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateReportDto,
  ): Promise<ClassReportSendResultDto> {
    return this.reportsService.sendClassReports(
      academyId,
      id,
      dto.periodStart,
      dto.periodEnd,
      dto.customMessage,
    );
  }
}
