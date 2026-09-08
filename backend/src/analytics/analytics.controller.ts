import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { TrackVisitDto } from './dto/track-visit.dto';
import { TrackVisitResponseDto } from './dto/track-visit-response.dto';
import { AnalyticsStatsQueryDto } from './dto/analytics-stats-query.dto';
import { DailyAnalyticsStatsDto } from './dto/daily-analytics-stats.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('08. 방문 통계 (Analytics)')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @HttpCode(HttpStatus.OK)
  // 공개 엔드포인트 스팸 방지: 로그인과 동일한 수준으로 제한. 어차피 서버에서
  // dedup되므로 카운트 조작은 안 되지만 무의미한 쓰기 폭주 자체를 막는다.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: '[비인증] 익명 방문 기록',
    description:
      '공개 페이지(랜딩/로그인) 방문 시 프론트가 호출하는 beacon. ' +
      '같은 날 같은 visitorId는 중복 집계되지 않는다.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: TrackVisitResponseDto })
  async track(@Body() dto: TrackVisitDto): Promise<TrackVisitResponseDto> {
    await this.analyticsService.trackAnonymousVisit(dto.visitorId);
    return { success: true };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '날짜별 방문/로그인/가입/학원개설 통계 (SUPER_ADMIN 전용)',
    description: '요청한 날짜 범위(기본 최근 30일)를 빈 구간 없이 반환한다.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [DailyAnalyticsStatsDto] })
  async getStats(
    @Query() query: AnalyticsStatsQueryDto,
  ): Promise<DailyAnalyticsStatsDto[]> {
    return this.analyticsService.getStats(query.startDate, query.endDate);
  }
}
