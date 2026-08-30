import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('06. 알림 및 카카오톡 관리 (Notifications)')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STAFF,
  )
  @ApiOperation({
    summary: '알림 및 카카오 안심 알림톡 발송 이력 목록 조회',
    description:
      '학원의 전체 알림, 미등원 경고, 출결 알림, 카카오톡/SMS 발송 내역을 조회하고 필터링합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '알림 목록 조회 성공',
    type: PaginatedNotificationResponseDto,
  })
  async getNotifications(
    @CurrentUser('academyId') academyId: number,
    @Query() queryDto: QueryNotificationDto,
  ): Promise<PaginatedNotificationResponseDto> {
    return this.notificationsService.getNotifications(academyId, queryDto);
  }

  @Get('unread-count')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STAFF,
  )
  @ApiOperation({
    summary:
      '안 읽은 알림 수 및 미등원 경고 알림 수 조회 (벨 아이콘 & 출결 신호 연동)',
    description:
      '헤더 알림 벨 아이콘 뱃지 및 출결 체크 버튼의 신호(펄스 효과)를 위한 안 읽은 알림 수를 반환합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '안 읽은 알림 수 조회 성공',
    type: UnreadCountResponseDto,
  })
  async getUnreadCount(
    @CurrentUser('academyId') academyId: number,
  ): Promise<UnreadCountResponseDto> {
    return this.notificationsService.getUnreadCount(academyId);
  }

  @Patch(':id/read')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STAFF,
  )
  @ApiOperation({
    summary: '특정 알림 읽음 처리',
    description: '알림을 읽음 상태로 변경합니다.',
  })
  @ApiParam({ name: 'id', description: '알림 ID', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '알림 읽음 처리 성공',
    type: NotificationResponseDto,
  })
  async markAsRead(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(academyId, id);
  }

  @Patch('read-all')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TEACHER,
    UserRole.STAFF,
  )
  @ApiOperation({
    summary: '모든 알림 일괄 읽음 처리',
    description: '학원의 모든 안 읽은 알림을 일괄 읽음 상태로 변경합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '전체 알림 읽음 처리 성공',
  })
  async markAllAsRead(
    @CurrentUser('academyId') academyId: number,
  ): Promise<{ success: boolean; count: number }> {
    return this.notificationsService.markAllAsRead(academyId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({
    summary: '알림 삭제',
    description: '특정 알림 기록을 삭제합니다.',
  })
  @ApiParam({ name: 'id', description: '알림 ID', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '알림 삭제 성공',
  })
  async deleteNotification(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean; message: string }> {
    return this.notificationsService.deleteNotification(academyId, id);
  }

  @Post(':id/retry')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: '실패한 카카오 알림톡/SMS 재발송',
    description: '발송 실패한 알림을 재전송합니다.',
  })
  @ApiParam({ name: 'id', description: '알림 ID', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '알림 재발송 성공',
    type: NotificationResponseDto,
  })
  async retryNotification(
    @CurrentUser('academyId') academyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.retryNotification(academyId, id);
  }
}
