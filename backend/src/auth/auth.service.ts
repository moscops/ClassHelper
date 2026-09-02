import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole, PlanTier, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { LoginDto } from './dto/login.dto';
import {
  AuthResponseDto,
  UserProfileDto,
  AcademySummaryDto,
  UserDetailResponseDto,
  TokensResponseDto,
  LogoutResponseDto,
} from './dto/auth-response.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 학원 신규 개설 및 원장(최고 관리자) 회원가입 (Access & Refresh Token 동시 발급)
   */
  async registerOwner(dto: RegisterOwnerDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일 주소입니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const academy = await tx.academy.create({
        data: {
          name: dto.academyName,
          businessNumber: dto.businessNumber,
          phoneNumber: dto.academyPhone,
          address: dto.address,
        },
      });

      const user = await tx.user.create({
        data: {
          academyId: academy.id,
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          role: UserRole.OWNER,
        },
      });

      // 신규 학원은 항상 FREE 요금제로 시작한다 (결제 연동 전까지는 관리자가 수동 변경).
      const subscription = await tx.subscription.create({
        data: { academyId: academy.id },
      });

      return { academy: { ...academy, subscription }, user };
    });

    this.logger.log(
      `새 학원 등록 완료: [${result.academy.name}] 원장: [${result.user.name}(${result.user.email})]`,
    );

    const tokens = await this.getTokens(result.user);
    await this.updateHashedRefreshToken(result.user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.mapToUserProfile(result.user),
      academy: this.mapToAcademySummary(result.academy),
    };
  }

  /**
   * 학원 내 강사/직원 추가 등록 (원장/관리자 전용)
   */
  async registerStaff(
    currentUser: CurrentUserPayload,
    dto: RegisterStaffDto,
  ): Promise<UserProfileDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일 주소입니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        academyId: currentUser.academyId,
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
      },
    });

    this.logger.log(
      `학원(${currentUser.academyId}) 내 강사/직원 추가: [${user.name}(${user.role})]`,
    );

    return this.mapToUserProfile(user);
  }

  /**
   * 로그인 (Access Token & Refresh Token 동시 발급)
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { academy: { include: { subscription: true } } },
    });

    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const tokens = await this.getTokens(user);
    await this.updateHashedRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.mapToUserProfile(user),
      academy: this.mapToAcademySummary(user.academy),
    };
  }

  /**
   * Refresh Token을 이용한 토큰 재발급 (Refresh Token Rotation - RTR 적용)
   */
  async refreshTokens(refreshToken: string): Promise<TokensResponseDto> {
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });
    } catch {
      throw new ForbiddenException(
        '유효하지 않거나 만료된 Refresh Token입니다.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException(
        '접근이 거부되었습니다 (토큰 정보 없음 또는 로그아웃 상태).',
      );
    }

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!isRefreshTokenMatching) {
      // 보안 조치: 탈취 및 비정상 사용 시도 시 기존 토큰 무효화
      await this.prisma.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken: null },
      });
      throw new ForbiddenException(
        '이미 사용되었거나 무효화된 Refresh Token입니다. 다시 로그인해주세요.',
      );
    }

    // 새 토큰 세트 발급 및 DB 해시 업데이트 (RTR)
    const tokens = await this.getTokens(user);
    await this.updateHashedRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(
      `토큰 재발급(RTR) 완료: 사용자 [${user.name}(ID: ${user.id})]`,
    );
    return tokens;
  }

  /**
   * 로그아웃 (서버 DB의 Refresh Token을 삭제하여 즉각 무효화)
   */
  async logout(userId: number): Promise<LogoutResponseDto> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });

    this.logger.log(`로그아웃 완료: 사용자 ID [${userId}]`);
    return {
      success: true,
      message: '성공적으로 로그아웃되었습니다.',
    };
  }

  /**
   * 현재 로그인 사용자 및 학원 정보 조회
   */
  async getMe(userId: number): Promise<UserDetailResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { academy: { include: { subscription: true } } },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return {
      ...this.mapToUserProfile(user),
      academy: this.mapToAcademySummary(user.academy),
    };
  }

  /**
   * Access Token & Refresh Token 생성
   */
  private async getTokens(user: {
    id: number;
    academyId?: number | null;
    email: string;
    name: string;
    role: UserRole;
  }): Promise<TokensResponseDto> {
    const payload = {
      sub: user.id,
      academyId: user.academyId ?? null,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';

    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh Token을 bcrypt로 해싱하여 DB에 안전하게 보관
   */
  private async updateHashedRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  private mapToUserProfile(user: {
    id: number;
    academyId?: number | null;
    email: string;
    name: string;
    phone: string | null;
    role: UserRole;
    createdAt: Date;
  }): UserProfileDto {
    return {
      id: user.id,
      academyId: user.academyId ?? null,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private mapToAcademySummary(
    academy?: {
      id: number;
      name: string;
      businessNumber: string | null;
      phoneNumber: string | null;
      address: string | null;
      subscription?: {
        tier: PlanTier;
        status: SubscriptionStatus;
        expiresAt: Date | null;
      } | null;
    } | null,
  ): AcademySummaryDto | null {
    if (!academy) {
      return null;
    }
    return {
      id: academy.id,
      name: academy.name,
      businessNumber: academy.businessNumber,
      phoneNumber: academy.phoneNumber,
      address: academy.address,
      // 구독 정보가 없는(마이그레이션 이전) 학원은 화면상 FREE로 취급한다 — 실제
      // 결제 이력이 없으므로 의미상으로도 정확하다(별도 백필 배치 불필요).
      subscription: academy.subscription
        ? {
            tier: academy.subscription.tier,
            status: academy.subscription.status,
            expiresAt: academy.subscription.expiresAt,
          }
        : {
            tier: PlanTier.FREE,
            status: SubscriptionStatus.ACTIVE,
            expiresAt: null,
          },
    };
  }
}
