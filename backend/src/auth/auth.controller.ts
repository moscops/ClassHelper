import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JoinStaffDto } from './dto/join-staff.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { StaffJoinCodeResponseDto } from './dto/staff-join-code-response.dto';
import {
  AuthResponseDto,
  StaffRegisteredResponseDto,
  StaffMemberResponseDto,
  StaffDeactivatedResponseDto,
  UserDetailResponseDto,
  TokensResponseDto,
  LogoutResponseDto,
  ChangePasswordResponseDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Auth (인증 및 계정 관리)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-owner')
  @ApiOperation({
    summary: '학원 신규 개설 및 원장(최고 관리자) 회원가입',
    description:
      '새로운 학원(Academy)과 원장님(OWNER) 계정을 동시에 생성하고 Access/Refresh Token을 발급합니다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '회원가입 및 학원 개설 성공',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '이미 사용 중인 이메일',
  })
  async registerOwner(@Body() dto: RegisterOwnerDto): Promise<AuthResponseDto> {
    return this.authService.registerOwner(dto);
  }

  @Post('register-staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '강사/직원 등록 (원장/관리자 전용)',
    description:
      '현재 소속된 학원에 강사(TEACHER), 실장(ADMIN), 조교(STAFF) 계정을 추가합니다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      '강사/직원 계정 생성 성공. 비밀번호를 입력하지 않았다면 tempPassword에 평문 임시 비밀번호가 1회만 담겨 온다.',
    type: StaffRegisteredResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '권한 부족 (원장/관리자만 가능)',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '이미 사용 중인 이메일',
  })
  async registerStaff(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: RegisterStaffDto,
  ): Promise<StaffRegisteredResponseDto> {
    return this.authService.registerStaff(currentUser, dto);
  }

  @Post('join-staff')
  @HttpCode(HttpStatus.CREATED)
  // 학원 코드 무작위 대입 방지: 로그인과 동일한 수준으로 제한.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: '[비인증] 학원코드로 교직원 자가입',
    description:
      '원장/실장에게 전달받은 학원 코드로 강사/조교 본인이 직접 계정을 만든다. ' +
      '승인 절차 없이 즉시 해당 학원 소속으로 등록되고 바로 로그인된 상태(토큰 발급)로 진입한다. ' +
      'ADMIN/OWNER는 이 API로 절대 될 수 없다.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '자가입 및 로그인 성공',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '유효하지 않은 학원 코드',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '이미 사용 중인 이메일',
  })
  async joinStaff(@Body() dto: JoinStaffDto): Promise<AuthResponseDto> {
    return this.authService.joinStaffByCode(dto);
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '교직원 목록 조회 (원장/관리자 전용)',
    description:
      '현재 소속 학원의 교직원 목록을 조회한다. 기본은 재직(ACTIVE)만 포함한다.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    description: 'true면 퇴사 처리된(INACTIVE) 계정도 함께 반환',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [StaffMemberResponseDto],
  })
  async listStaff(
    @CurrentUser('academyId') academyId: number,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<StaffMemberResponseDto[]> {
    return this.authService.listStaff(academyId, includeInactive === 'true');
  }

  @Patch('staff/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '교직원 정보 수정 (원장/관리자 전용)',
    description:
      '이름/연락처/직책을 수정한다. 원장(OWNER) 계정은 대상이 될 수 없고, ' +
      '직책은 ADMIN/TEACHER/STAFF로만 변경 가능하다(권한 상승 방지).',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StaffMemberResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '교직원을 찾을 수 없음',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '원장 계정은 수정 불가',
  })
  async updateStaff(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffMemberResponseDto> {
    return this.authService.updateStaff(currentUser, id, dto);
  }

  @Patch('staff/:id/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '교직원 비밀번호 초기화 (원장/관리자 전용)',
    description:
      '강사/조교의 비밀번호를 임시 비밀번호로 초기화한다. 대상이 원장/실장(OWNER/ADMIN)이면 ' +
      '거부된다 — 본인 비밀번호는 반드시 본인이 변경해야 한다. 성공 시 대상 계정은 강제 로그아웃된다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      '초기화 성공. tempPassword에 새 임시 비밀번호가 1회만 담겨 온다.',
    type: StaffRegisteredResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '대상이 원장/실장이거나 권한 부족',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '교직원을 찾을 수 없음',
  })
  async resetStaffPassword(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StaffRegisteredResponseDto> {
    return this.authService.resetStaffPassword(currentUser, id);
  }

  @Delete('staff/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '교직원 퇴사 처리 (원장/관리자 전용)',
    description:
      '소프트 삭제 — status를 INACTIVE로 바꾸고 강제 로그아웃시킨다(데이터는 보존). ' +
      '원장 계정과 본인 계정은 대상이 될 수 없다.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StaffDeactivatedResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '교직원을 찾을 수 없음',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '원장 계정/본인 계정은 퇴사 처리 불가',
  })
  async deactivateStaff(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StaffDeactivatedResponseDto> {
    return this.authService.deactivateStaff(currentUser, id);
  }

  @Post('staff-join-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '교직원 학원코드 자가입 코드 발급/재발급',
    description:
      '재발급 시 기존 코드는 즉시 무효화되어, 이미 배포한 코드/링크는 다시 안내해야 한다.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: StaffJoinCodeResponseDto })
  async generateStaffJoinCode(
    @CurrentUser('academyId') academyId: number,
  ): Promise<StaffJoinCodeResponseDto> {
    return this.authService.generateStaffJoinCode(academyId);
  }

  @Get('staff-join-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '현재 발급된 교직원 학원코드 조회',
    description:
      '재발급 없이 현재 값만 조회한다(아직 발급된 적이 없으면 null). ' +
      'kiosk-token GET과 동일한 이유로, 여러 기기에서 열 때 이 값을 신뢰해야 한다.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StaffJoinCodeResponseDto })
  async getStaffJoinCode(
    @CurrentUser('academyId') academyId: number,
  ): Promise<StaffJoinCodeResponseDto> {
    return this.authService.getStaffJoinCode(academyId);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // 브루트포스 방지: 동일 IP당 60초에 5회로 제한 (앱 전역 기본값 100회/60초보다 엄격).
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: '로그인',
    description:
      '이메일과 비밀번호로 로그인하여 Access Token(15분) 및 Refresh Token(7일)을 발급받습니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '로그인 성공',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '이메일 또는 비밀번호 불일치',
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  // Refresh Token 탈취/재사용 시도를 통한 무차별 대입도 동일하게 제한.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: '토큰 재발급 (Refresh Token 활용)',
    description:
      'Access Token 만료 시 Refresh Token을 전달하여 새 Access Token과 새 Refresh Token(RTR)을 발급받습니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '토큰 재발급 성공',
    type: TokensResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '유효하지 않거나 만료/사용된 Refresh Token',
  })
  async refreshTokens(
    @Body() dto: RefreshTokenDto,
  ): Promise<TokensResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '로그아웃',
    description:
      '현재 로그인된 사용자의 DB Refresh Token을 삭제하여 즉각 무효화합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '로그아웃 성공',
    type: LogoutResponseDto,
  })
  async logout(
    @CurrentUser('userId') userId: number,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(userId);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  // 현재 비밀번호 대입 시도 방지: 로그인과 동일한 수준으로 제한.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: '내 비밀번호 변경',
    description:
      '현재 비밀번호를 확인한 뒤 새 비밀번호로 변경한다. 원장이 발급한 임시 비밀번호로 로그인한 ' +
      '계정(mustChangePassword=true)도 이 API로 변경하면 플래그가 해제된다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '비밀번호 변경 성공',
    type: ChangePasswordResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '현재 비밀번호 불일치',
  })
  async changePassword(
    @CurrentUser('userId') userId: number,
    @Body() dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return this.authService.changePassword(userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '내 정보 및 소속 학원 조회',
    description:
      '현재 JWT 토큰으로 인증된 사용자의 정보와 소속 학원 정보를 반환합니다.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '사용자 및 학원 정보 조회 성공',
    type: UserDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '유효하지 않거나 만료된 토큰',
  })
  async getMe(
    @CurrentUser('userId') userId: number,
  ): Promise<UserDetailResponseDto> {
    return this.authService.getMe(userId);
  }
}
