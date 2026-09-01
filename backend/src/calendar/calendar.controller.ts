import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
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
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('06. 캘린더 (Calendar)')
@Controller('calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  @ApiOperation({
    summary: '학원 이벤트 목록 조회',
    description:
      '학원 전체 이벤트를 시작일 기준으로 조회합니다. 인증된 모든 역할이 조회할 수 있습니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '이벤트 목록 조회 성공',
    type: [EventResponseDto],
  })
  async findAll(
    @CurrentUser('academyId') academyId: number,
  ): Promise<EventResponseDto[]> {
    return this.calendarService.findAll(academyId);
  }

  @Post('events')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '학원 이벤트 생성',
    description: '학원 공식 행사/시험/특강/휴원/상담 등의 이벤트를 등록합니다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '이벤트 생성 성공',
    type: EventResponseDto,
  })
  async create(
    @CurrentUser('academyId') academyId: number,
    @Body() dto: CreateEventDto,
  ): Promise<EventResponseDto> {
    return this.calendarService.create(academyId, dto);
  }

  @Patch('events/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '학원 이벤트 수정',
    description: '이벤트의 제목/카테고리/일시/설명 등을 수정합니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '이벤트 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '이벤트 수정 성공',
    type: EventResponseDto,
  })
  async update(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    return this.calendarService.update(academyId, id, dto);
  }

  @Delete('events/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '학원 이벤트 삭제',
    description: '등록된 학원 이벤트를 삭제합니다.',
  })
  @ApiParam({ name: 'id', example: 1, description: '이벤트 ID' })
  @ApiResponse({ status: HttpStatus.OK, description: '이벤트 삭제 성공' })
  async remove(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.calendarService.remove(academyId, id);
  }
}
