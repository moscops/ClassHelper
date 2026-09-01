import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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
import { TuitionService } from './tuition.service';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  GenerateInvoicesResultDto,
  InvoiceResponseDto,
  PaginatedInvoiceResponseDto,
  RevenueStatsResponseDto,
} from './dto/tuition-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('04. 수강료 청구 및 수납 관리 (Billing & Tuition)')
@Controller('tuition')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class TuitionController {
  constructor(private readonly tuitionService: TuitionService) {}

  @Post('invoices/generate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '월간 수강료 청구서 일괄 자동 생성',
    description:
      '지정한 청구 년월 기준 활성 수강생 전원의 청구서를 자동 생성합니다. 휴원/퇴원생은 제외되며, 이미 생성된 원생은 건너뜁니다(중복 청구 방지).',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '청구서 일괄 생성 성공',
    type: GenerateInvoicesResultDto,
  })
  async generateInvoices(
    @CurrentUser('academyId') academyId: number,
    @Body() dto: GenerateInvoicesDto,
  ): Promise<GenerateInvoicesResultDto> {
    return this.tuitionService.generateMonthlyInvoices(academyId, dto);
  }

  @Get('invoices')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '청구서 목록 조회 (필터 및 페이징)',
    description:
      '청구 년월, 상태, 원생, 검색어로 필터링하여 청구서 목록을 페이징 조회합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '청구서 목록 조회 성공',
    type: PaginatedInvoiceResponseDto,
  })
  async findAll(
    @CurrentUser('academyId') academyId: number,
    @Query() query: QueryInvoicesDto,
  ): Promise<PaginatedInvoiceResponseDto> {
    return this.tuitionService.findAll(academyId, query);
  }

  @Get('invoices/unpaid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '미납자 명단 조회',
    description:
      '미납(UNPAID) 및 부분수납(PARTIALLY_PAID) 상태의 청구서를 납부 마감일 순으로 조회합니다.',
  })
  @ApiQuery({ name: 'billingYearMonth', required: false, example: '2026-09' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '미납자 명단 조회 성공',
    type: [InvoiceResponseDto],
  })
  async getUnpaid(
    @CurrentUser('academyId') academyId: number,
    @Query('billingYearMonth') billingYearMonth?: string,
  ): Promise<InvoiceResponseDto[]> {
    return this.tuitionService.getUnpaidInvoices(academyId, billingYearMonth);
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: '학원 월별 매출/수납률 통계',
    description:
      '지정한 청구 년월 기준 총 청구액, 총 수납액, 수납률, 상태별 청구서 수를 집계합니다.',
  })
  @ApiQuery({ name: 'billingYearMonth', required: true, example: '2026-09' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '매출/수납률 통계 조회 성공',
    type: RevenueStatsResponseDto,
  })
  async getStats(
    @CurrentUser('academyId') academyId: number,
    @Query('billingYearMonth') billingYearMonth: string,
  ): Promise<RevenueStatsResponseDto> {
    return this.tuitionService.getRevenueStats(academyId, billingYearMonth);
  }

  @Get('invoices/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '청구서 상세 조회',
    description:
      '청구서 상세 정보와 수납 이력(TuitionPayment)을 함께 조회합니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '청구서 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '청구서 상세 조회 성공',
    type: InvoiceResponseDto,
  })
  async findOne(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InvoiceResponseDto> {
    return this.tuitionService.findOne(academyId, id);
  }

  @Patch('invoices/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: '개별 청구서 할인/수정',
    description:
      '할인 금액, 납부 마감일, 청구 상세를 수정합니다. 취소(VOID)된 청구서는 수정할 수 없습니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '청구서 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '청구서 수정 성공',
    type: InvoiceResponseDto,
  })
  async update(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.tuitionService.update(academyId, id, dto);
  }

  @Patch('invoices/:id/void')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: '청구서 취소',
    description:
      '휴원/퇴원 또는 오발행된 청구서를 취소(VOID) 처리합니다. 이미 수납된 금액이 있으면 취소할 수 없습니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '청구서 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '청구서 취소 성공',
    type: InvoiceResponseDto,
  })
  async voidInvoice(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InvoiceResponseDto> {
    return this.tuitionService.voidInvoice(academyId, id);
  }

  @Post('invoices/:id/payments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '수강료 수납 처리',
    description:
      '카드/현금/계좌이체 등 결제 수단별 수납 내역을 등록합니다. 청구 잔액을 초과하는 결제는 거부됩니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '청구서 ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '수납 처리 성공',
    type: InvoiceResponseDto,
  })
  async recordPayment(
    @CurrentUser('academyId') academyId: number,
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaymentDto,
  ): Promise<InvoiceResponseDto> {
    return this.tuitionService.recordPayment(academyId, id, userId, dto);
  }

  @Post('invoices/:id/send-reminder')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '미납자 대상 카카오 납부 안내 알림톡 발송',
    description: '해당 청구서의 학부모 연락처로 미납 안내 알림톡을 발송합니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '청구서 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '납부 안내 발송 성공',
  })
  async sendReminder(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.tuitionService.sendPaymentReminder(academyId, id);
  }
}
