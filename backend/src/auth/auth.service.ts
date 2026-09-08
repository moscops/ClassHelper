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
import { randomInt, randomBytes } from 'crypto';
import {
  UserRole,
  UserStatus,
  AcademyStatus,
  PlanTier,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JoinStaffDto } from './dto/join-staff.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { StaffJoinCodeResponseDto } from './dto/staff-join-code-response.dto';
import {
  AuthResponseDto,
  UserProfileDto,
  StaffRegisteredResponseDto,
  StaffMemberResponseDto,
  StaffDeactivatedResponseDto,
  AcademySummaryDto,
  UserDetailResponseDto,
  TokensResponseDto,
  LogoutResponseDto,
  ChangePasswordResponseDto,
} from './dto/auth-response.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly analyticsService: AnalyticsService,
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
  ): Promise<StaffRegisteredResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일 주소입니다.');
    }

    // 비밀번호를 원장이 직접 입력하지 않았으면 서버가 임시 비밀번호를 생성한다.
    // 원장이 입력했든 서버가 생성했든, 본인이 고른 비밀번호가 아니므로 최초
    // 로그인 시 반드시 변경하도록 mustChangePassword를 true로 표시한다.
    const tempPassword = dto.password ?? this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        academyId: currentUser.academyId,
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        mustChangePassword: true,
      },
    });

    this.logger.log(
      `학원(${currentUser.academyId}) 내 강사/직원 추가: [${user.name}(${user.role})]`,
    );

    return {
      ...this.mapToUserProfile(user),
      // 원장이 비밀번호를 직접 지정한 경우 이미 알고 있으므로 다시 돌려줄 필요 없음.
      ...(dto.password ? {} : { tempPassword }),
    };
  }

  /**
   * 학원 내 교직원(원장 본인 제외) 목록 조회. 기본은 재직(ACTIVE)만 반환.
   */
  async listStaff(
    academyId: number,
    includeInactive: boolean,
  ): Promise<StaffMemberResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: {
        academyId,
        ...(includeInactive ? {} : { status: UserStatus.ACTIVE }),
      },
      include: {
        _count: {
          select: {
            taughtClasses: true,
            classLogs: true,
            processedPayments: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => this.mapToStaffMember(u));
  }

  /**
   * 교직원 정보(이름/연락처/직책) 수정. 원장(OWNER) 계정은 이 API로 건드릴 수 없고,
   * role은 DTO에서 이미 ADMIN/TEACHER/STAFF로만 제한되어 있어 권한 상승이 불가능하다.
   */
  async updateStaff(
    currentUser: CurrentUserPayload,
    targetId: number,
    dto: UpdateStaffDto,
  ): Promise<StaffMemberResponseDto> {
    const target = await this.findStaffOrThrow(currentUser.academyId, targetId);
    if (target.role === UserRole.OWNER) {
      throw new ForbiddenException(
        '원장 계정은 교직원 관리에서 수정할 수 없습니다.',
      );
    }
    // 실장(ADMIN)의 직책 변경은 원장만 가능하다. 그렇지 않으면 실장 A가 동료 실장 B를
    // TEACHER로 강등시켜 resetStaffPassword의 "대상이 OWNER/ADMIN이면 거부" 체크를
    // 우회한 뒤 곧바로 B의 비밀번호를 초기화·강제 로그아웃시킬 수 있다(동료 계정 탈취).
    if (
      dto.role !== undefined &&
      target.role === UserRole.ADMIN &&
      currentUser.role !== UserRole.OWNER
    ) {
      throw new ForbiddenException(
        '실장 계정의 직책 변경은 원장만 할 수 있습니다.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
      },
      include: {
        _count: {
          select: {
            taughtClasses: true,
            classLogs: true,
            processedPayments: true,
          },
        },
      },
    });

    this.logger.log(
      `교직원 정보 수정: 학원(${currentUser.academyId}) 대상 [${updated.name}(ID: ${updated.id})]`,
    );
    return this.mapToStaffMember(updated);
  }

  /**
   * 교직원 비밀번호 관리자發 초기화. 대상이 OWNER/ADMIN(원장/실장)이면 거부한다 —
   * 본인 비밀번호는 반드시 본인이 PATCH /auth/change-password로만 바꿔야 하며,
   * 교직원 관리 화면에서 타인이 초기화할 수 있는 대상이 아니다(프론트 버튼 숨김과
   *별개로 서버가 실제로 강제한다).
   */
  async resetStaffPassword(
    currentUser: CurrentUserPayload,
    targetId: number,
  ): Promise<StaffRegisteredResponseDto> {
    const target = await this.findStaffOrThrow(currentUser.academyId, targetId);
    if (target.role === UserRole.OWNER || target.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        '원장/실장 계정은 교직원 관리에서 비밀번호를 초기화할 수 없습니다. 본인 비밀번호는 보안 관리 메뉴에서 직접 변경해주세요.',
      );
    }

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
        // 새 임시 비밀번호를 모르는 채로 기존 세션이 계속 쓰이지 않도록 강제 로그아웃.
        hashedRefreshToken: null,
      },
    });

    this.logger.log(
      `교직원 비밀번호 초기화: 학원(${currentUser.academyId}) 대상 [${updated.name}(ID: ${updated.id})]`,
    );
    return { ...this.mapToUserProfile(updated), tempPassword };
  }

  /**
   * 교직원 퇴사 처리(소프트 삭제). 하드 삭제하지 않는 이유는 ClassLog.teacher 등
   * onDelete: Cascade 관계 때문에 실제로 지우면 그 교직원이 남긴 수업일지/결제
   * 이력이 함께 사라지기 때문 — status만 INACTIVE로 바꿔 로그인만 차단한다.
   */
  async deactivateStaff(
    currentUser: CurrentUserPayload,
    targetId: number,
  ): Promise<StaffDeactivatedResponseDto> {
    const target = await this.findStaffOrThrow(currentUser.academyId, targetId);
    if (target.role === UserRole.OWNER) {
      throw new ForbiddenException('원장 계정은 퇴사 처리할 수 없습니다.');
    }
    if (target.id === currentUser.userId) {
      throw new ForbiddenException('본인 계정은 퇴사 처리할 수 없습니다.');
    }

    await this.prisma.user.update({
      where: { id: targetId },
      data: { status: UserStatus.INACTIVE, hashedRefreshToken: null },
    });

    this.logger.log(
      `교직원 퇴사 처리: 학원(${currentUser.academyId}) 대상 [${target.name}(ID: ${target.id})]`,
    );
    return { success: true, message: '퇴사 처리되었습니다.' };
  }

  /**
   * 학원코드 자가입용 코드를 새로 발급(재발급)한다. kioskToken과 동일한 패턴 —
   * 재발급 시 기존 코드는 즉시 무효화된다.
   */
  async generateStaffJoinCode(
    academyId: number,
  ): Promise<StaffJoinCodeResponseDto> {
    const staffJoinCode = randomBytes(24).toString('hex');
    await this.prisma.academy.update({
      where: { id: academyId },
      data: { staffJoinCode },
    });
    return { staffJoinCode };
  }

  /**
   * 현재 발급된 학원코드를 재발급 없이 조회한다(kiosk-token GET과 동일한 이유 —
   * 다른 기기의 캐시가 재발급으로 무효화되는 문제를 막기 위해 조회 전용 API가 따로 필요).
   */
  async getStaffJoinCode(academyId: number): Promise<StaffJoinCodeResponseDto> {
    const academy = await this.prisma.academy.findUnique({
      where: { id: academyId },
      select: { staffJoinCode: true },
    });
    return { staffJoinCode: academy?.staffJoinCode ?? null };
  }

  /**
   * 학원코드로 교직원 자가입. 원장/실장이 코드를 공유하면, 강사/조교가 직접
   * 계정을 만들어 즉시(승인 절차 없이) 해당 학원 소속으로 등록된다. role은 DTO에서
   * TEACHER/STAFF로만 제한되어 있어 자가입으로 ADMIN/OWNER가 될 수 없다.
   */
  async joinStaffByCode(dto: JoinStaffDto): Promise<AuthResponseDto> {
    const academy = await this.prisma.academy.findUnique({
      where: { staffJoinCode: dto.code },
      include: { subscription: true },
    });
    if (!academy || academy.status !== AcademyStatus.ACTIVE) {
      throw new NotFoundException('유효하지 않은 학원 코드입니다.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일 주소입니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        academyId: academy.id,
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        // 본인이 직접 정한 비밀번호이므로 최초 로그인 강제 변경이 필요 없다.
        mustChangePassword: false,
      },
    });

    this.logger.log(
      `학원코드 자가입 완료: 학원(${academy.id}) [${user.name}(${user.role})]`,
    );

    const tokens = await this.getTokens(user);
    await this.updateHashedRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: this.mapToUserProfile(user),
      academy: this.mapToAcademySummary(academy),
    };
  }

  /**
   * academyId로 스코프된 교직원 1명을 조회, 없으면 404. list/update/reset/delete가 공유한다.
   */
  private async findStaffOrThrow(
    academyId: number | null | undefined,
    targetId: number,
  ) {
    // academyId가 없으면(SUPER_ADMIN 등) 절대 전체 학원을 대상으로 조회하지 않고 즉시 실패한다
    // — 이 경로는 실제로는 RolesGuard가 OWNER/ADMIN만 통과시켜 항상 값이 있지만, 방어적으로도 막는다.
    if (!academyId) {
      throw new NotFoundException('교직원을 찾을 수 없습니다.');
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetId, academyId },
    });
    if (!target) {
      throw new NotFoundException('교직원을 찾을 수 없습니다.');
    }
    return target;
  }

  private mapToStaffMember(user: {
    id: number;
    academyId: number | null;
    email: string;
    name: string;
    phone: string | null;
    role: UserRole;
    status: UserStatus;
    mustChangePassword: boolean;
    createdAt: Date;
    _count: {
      taughtClasses: number;
      classLogs: number;
      processedPayments: number;
    };
  }): StaffMemberResponseDto {
    return {
      ...this.mapToUserProfile(user),
      status: user.status,
      taughtClassesCount: user._count.taughtClasses,
      classLogsCount: user._count.classLogs,
      processedPaymentsCount: user._count.processedPayments,
    };
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

    // 퇴사 처리(소프트 삭제)된 계정은 로그인을 차단한다. 계정 상태를 유추할 수 없도록
    // 자격증명 불일치와 동일한 메시지를 사용한다.
    if (user.status === UserStatus.INACTIVE) {
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

    // 방문 통계 기록 실패가 로그인 자체를 막아서는 안 된다 — 통계는 부가 기능이다.
    try {
      await this.analyticsService.recordStaffVisit(user.id, user.academyId ?? null);
    } catch (err) {
      this.logger.warn(
        `방문 기록 실패(로그인은 정상 처리됨): ${(err as Error).message}`,
      );
    }

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
   * 본인 비밀번호 변경 (원장이 발급한 임시 비밀번호 포함, 모든 역할 공통).
   * 성공 시 mustChangePassword를 해제한다.
   */
  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    this.logger.log(`비밀번호 변경 완료: 사용자 ID [${userId}]`);
    return {
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
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
    mustChangePassword: boolean;
    createdAt: Date;
  }): UserProfileDto {
    return {
      id: user.id,
      academyId: user.academyId ?? null,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
    };
  }

  /**
   * 강사/직원 등록 시 원장이 비밀번호를 직접 입력하지 않은 경우 사용할 임시 비밀번호 생성.
   * 각 문자 종류(영문/숫자/특수문자)를 최소 1개씩 보장해 비밀번호 정책 정규식을 항상 만족시킨다.
   */
  private generateTempPassword(): string {
    // 혼동되기 쉬운 문자(0/O, 1/l/I 등) 제외.
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%^&*';
    const pick = (pool: string) => pool[randomInt(pool.length)];

    const body = Array.from({ length: 8 }, () => pick(letters + digits)).join(
      '',
    );
    return `${pick(letters)}${body}${pick(digits)}${pick(special)}`;
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
