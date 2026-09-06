import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AttendanceService } from './attendance.service';
import { KioskLookupDto } from './dto/kiosk-lookup.dto';
import { KioskCheckInDto } from './dto/kiosk-check-in.dto';
import { KioskLookupResponseDto } from './dto/kiosk-response.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';

// 학원 로비에 비치된 키오스크 기기에서 학생이 스스로 전화번호 뒷자리를 입력해
// 등/하원을 체크하는 용도. 학생/교사 로그인이 아니라 kioskToken(학원별 발급)으로만
// 학원을 식별하므로 의도적으로 JwtAuthGuard/RolesGuard를 걸지 않은 별도 컨트롤러다.
// 브루트포스(전화번호 뒷자리 4자리 무작위 대입) 방지를 위해 auth/login과 동일한
// 수준의 rate limit을 적용한다.
@ApiTags('03. 출결 관리 (Attendance) - 키오스크(비인증)')
@Controller('attendance/kiosk')
export class AttendanceKioskController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: '[키오스크/비인증] 전화번호 뒷자리로 학생 조회',
    description:
      '학원 로비 키오스크에서 학생이 전화번호 뒷자리 4자리를 입력하면, 일치하는 학생과 오늘 체크인 가능한 수업 목록을 반환한다.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: KioskLookupResponseDto })
  async lookup(@Body() dto: KioskLookupDto): Promise<KioskLookupResponseDto> {
    return this.attendanceService.kioskLookup(dto);
  }

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: '[키오스크/비인증] 학생 등/하원 체크',
    description: 'lookup에서 확인한 학생/수업 ID로 실제 출결을 기록한다.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: AttendanceResponseDto })
  async checkIn(@Body() dto: KioskCheckInDto): Promise<AttendanceResponseDto> {
    return this.attendanceService.kioskCheckIn(dto);
  }
}
