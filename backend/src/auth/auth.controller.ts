import {
  Controller,
  Post,
  Get,
  Body,
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
import { AuthService } from './auth.service';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  AuthResponseDto,
  UserProfileDto,
  UserDetailResponseDto,
  TokensResponseDto,
  LogoutResponseDto,
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
    description: '강사/직원 계정 생성 성공',
    type: UserProfileDto,
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
  ): Promise<UserProfileDto> {
    return this.authService.registerStaff(currentUser, dto);
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
