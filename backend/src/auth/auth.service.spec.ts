import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let analyticsService: any;

  const mockUser = {
    id: 1,
    academyId: 10,
    email: 'owner@classhelper.kr',
    password: 'hashedPassword',
    name: '김원장',
    phone: '010-1234-5678',
    role: UserRole.OWNER,
    hashedRefreshToken: 'hashed_refresh_token_value',
    mustChangePassword: false,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    academy: {
      id: 10,
      name: '클래스헬퍼 어학원',
      businessNumber: '123-45-67890',
      phoneNumber: '02-1234-5678',
      address: '서울시 강남구',
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    analyticsService = {
      recordStaffVisit: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      academy: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      subscription: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    jwtService = {
      signAsync: jest.fn().mockImplementation((payload, options) => {
        if (options?.secret?.includes('refresh')) {
          return Promise.resolve('mocked-refresh-token');
        }
        return Promise.resolve('mocked-access-token');
      }),
      verify: jest.fn().mockReturnValue({
        sub: 1,
        academyId: 10,
        email: 'owner@classhelper.kr',
        role: UserRole.OWNER,
      }),
    };

    const resolveConfig = (key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'mock-access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'mock-refresh-secret';
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      return null;
    };
    configService = {
      get: jest.fn(resolveConfig),
      getOrThrow: jest.fn(resolveConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerOwner', () => {
    it('새 학원 개설 및 원장 등록 성공 시 Access/Refresh 토큰과 프로필 반환', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      prisma.academy.create.mockResolvedValue(mockUser.academy);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.subscription.create.mockResolvedValue({
        id: 1,
        academyId: mockUser.academy.id,
        tier: 'FREE',
        status: 'ACTIVE',
        expiresAt: null,
      });

      const result = await service.registerOwner({
        academyName: '클래스헬퍼 어학원',
        email: 'owner@classhelper.kr',
        password: 'password123!',
        name: '김원장',
      });

      expect(result.accessToken).toBe('mocked-access-token');
      expect(result.refreshToken).toBe('mocked-refresh-token');
      expect(result.user.email).toBe('owner@classhelper.kr');
      expect(result.academy.name).toBe('클래스헬퍼 어학원');
      expect(result.academy.subscription?.tier).toBe('FREE');
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: { academyId: mockUser.academy.id },
      });
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('이메일 중복 시 ConflictException 발생', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.registerOwner({
          academyName: '새 학원',
          email: 'owner@classhelper.kr',
          password: 'password123!',
          name: '김원장',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('registerStaff', () => {
    it('강사/직원 등록 성공 시 생성된 사용자 프로필 반환', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      const staffUser = {
        ...mockUser,
        id: 2,
        email: 'teacher@classhelper.kr',
        role: UserRole.TEACHER,
        mustChangePassword: true,
      };
      prisma.user.create.mockResolvedValue(staffUser);

      const result = await service.registerStaff(
        {
          userId: 1,
          academyId: 10,
          email: 'owner@classhelper.kr',
          name: '김원장',
          role: UserRole.OWNER,
        },
        {
          email: 'teacher@classhelper.kr',
          password: 'password123!',
          name: '이강사',
          role: UserRole.TEACHER,
        },
      );

      expect(result.email).toBe('teacher@classhelper.kr');
      expect(result.role).toBe(UserRole.TEACHER);
      expect(result.mustChangePassword).toBe(true);
    });

    it('원장이 비밀번호를 직접 지정하면 응답에 tempPassword가 포함되지 않는다', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        id: 2,
        email: 'teacher@classhelper.kr',
        role: UserRole.TEACHER,
        mustChangePassword: true,
      });

      const result = await service.registerStaff(
        {
          userId: 1,
          academyId: 10,
          email: 'owner@classhelper.kr',
          name: '김원장',
          role: UserRole.OWNER,
        },
        {
          email: 'teacher@classhelper.kr',
          password: 'password123!',
          name: '이강사',
          role: UserRole.TEACHER,
        },
      );

      expect(result.tempPassword).toBeUndefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123!', 10);
    });

    it('비밀번호를 생략하면 서버가 임시 비밀번호를 생성해 tempPassword로 1회 반환한다', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        id: 2,
        email: 'teacher@classhelper.kr',
        role: UserRole.TEACHER,
        mustChangePassword: true,
      });

      const result = await service.registerStaff(
        {
          userId: 1,
          academyId: 10,
          email: 'owner@classhelper.kr',
          name: '김원장',
          role: UserRole.OWNER,
        },
        {
          email: 'teacher@classhelper.kr',
          name: '이강사',
          role: UserRole.TEACHER,
        } as any,
      );

      expect(result.tempPassword).toBeDefined();
      // 비밀번호 정책 정규식(영문+숫자+특수문자, 8자 이상)을 항상 만족해야 한다.
      expect(result.tempPassword).toMatch(
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(result.tempPassword, 10);
    });
  });

  describe('login', () => {
    it('올바른 로그인 정보 입력 시 Access/Refresh 토큰 및 프로필 반환', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'owner@classhelper.kr',
        password: 'password123!',
      });

      expect(result.accessToken).toBe('mocked-access-token');
      expect(result.refreshToken).toBe('mocked-refresh-token');
      expect(result.user.email).toBe('owner@classhelper.kr');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('존재하지 않는 이메일일 때 UnauthorizedException 발생', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@classhelper.kr',
          password: 'password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('비밀번호 불일치 시 UnauthorizedException 발생', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'owner@classhelper.kr',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('퇴사 처리(INACTIVE)된 계정은 비밀번호가 맞아도 UnauthorizedException 발생', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: UserStatus.INACTIVE,
      });

      await expect(
        service.login({
          email: 'owner@classhelper.kr',
          password: 'password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
      // 자격증명 실패와 구분되지 않도록 비밀번호 대조 자체를 시도하지 않아야 한다.
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('로그인 성공 시 방문 기록(recordStaffVisit)을 호출한다', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);

      await service.login({
        email: 'owner@classhelper.kr',
        password: 'password123!',
      });

      expect(analyticsService.recordStaffVisit).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.academyId,
      );
    });

    it('방문 기록이 실패해도 로그인 자체는 성공한다', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);
      analyticsService.recordStaffVisit.mockRejectedValue(new Error('DB down'));

      const result = await service.login({
        email: 'owner@classhelper.kr',
        password: 'password123!',
      });

      expect(result.accessToken).toBe('mocked-access-token');
    });
  });

  describe('refreshTokens', () => {
    it('유효한 Refresh Token으로 새 Access/Refresh 토큰 발급 성공', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBe('mocked-access-token');
      expect(result.refreshToken).toBe('mocked-refresh-token');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('토큰 검증 실패 시 ForbiddenException 발생', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.refreshTokens('invalid-refresh-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DB의 해시와 불일치 시 ForbiddenException 발생 및 기존 토큰 무효화', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens('wrong-refresh-token'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { hashedRefreshToken: null },
      });
    });
  });

  describe('logout', () => {
    it('로그아웃 시 DB의 hashedRefreshToken을 null로 초기화', async () => {
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        hashedRefreshToken: null,
      });

      const result = await service.logout(1);

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { hashedRefreshToken: null },
      });
    });
  });

  describe('changePassword', () => {
    it('현재 비밀번호가 일치하면 비밀번호를 변경하고 mustChangePassword를 해제한다', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mustChangePassword: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.changePassword(1, {
        currentPassword: 'oldPassword123!',
        newPassword: 'NewPassword456!',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'oldPassword123!',
        mockUser.password,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'newHashedPassword', mustChangePassword: false },
      });
      expect(result.success).toBe(true);
    });

    it('현재 비밀번호가 틀리면 UnauthorizedException 발생', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(1, {
          currentPassword: 'wrongPassword!',
          newPassword: 'NewPassword456!',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('존재하지 않는 사용자일 때 NotFoundException 발생', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(999, {
          currentPassword: 'oldPassword123!',
          newPassword: 'NewPassword456!',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMe', () => {
    it('사용자 조회 성공 시 상세 정보 반환', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe(1);

      expect(result.id).toBe(1);
      expect(result.academy.id).toBe(10);
    });

    it('존재하지 않는 사용자일 때 NotFoundException 발생', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe(999)).rejects.toThrow(NotFoundException);
    });
  });

  const mockCurrentOwner = {
    userId: 1,
    academyId: 10,
    email: 'owner@classhelper.kr',
    name: '김원장',
    role: UserRole.OWNER,
  };

  const mockTeacher = {
    id: 2,
    academyId: 10,
    email: 'teacher@classhelper.kr',
    password: 'hashedPassword',
    name: '이강사',
    phone: null,
    role: UserRole.TEACHER,
    hashedRefreshToken: null,
    mustChangePassword: false,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { taughtClasses: 2, classLogs: 5, processedPayments: 1 },
  };

  describe('listStaff', () => {
    it('academyId로 스코프된 재직(ACTIVE) 교직원 목록을 담당 수/일지 수와 함께 반환한다', async () => {
      prisma.user.findMany.mockResolvedValue([mockTeacher]);

      const result = await service.listStaff(10, false);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { academyId: 10, status: UserStatus.ACTIVE },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].taughtClassesCount).toBe(2);
      expect(result[0].classLogsCount).toBe(5);
      expect(result[0].processedPaymentsCount).toBe(1);
    });

    it('includeInactive=true면 status 필터 없이 조회한다', async () => {
      prisma.user.findMany.mockResolvedValue([mockTeacher]);

      await service.listStaff(10, true);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { academyId: 10 } }),
      );
    });
  });

  describe('updateStaff', () => {
    it('교직원 이름/연락처/직책을 수정한다', async () => {
      prisma.user.findFirst.mockResolvedValue(mockTeacher);
      prisma.user.update.mockResolvedValue({
        ...mockTeacher,
        name: '박강사',
        role: UserRole.ADMIN,
      });

      const result = await service.updateStaff(mockCurrentOwner, 2, {
        name: '박강사',
        role: UserRole.ADMIN,
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 2, academyId: 10 },
      });
      expect(result.name).toBe('박강사');
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('대상이 없거나 다른 학원 소속이면 NotFoundException 발생', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStaff(mockCurrentOwner, 999, { name: '박강사' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('대상이 원장(OWNER)이면 ForbiddenException 발생', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, id: 1 });

      await expect(
        service.updateStaff(mockCurrentOwner, 1, { name: '변경시도' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('실장(ADMIN)이 동료 실장의 직책을 변경하려 하면 ForbiddenException 발생 (동료 계정 탈취용 강등 차단)', async () => {
      const mockCurrentAdmin = { ...mockCurrentOwner, role: UserRole.ADMIN };
      prisma.user.findFirst.mockResolvedValue({
        ...mockTeacher,
        id: 3,
        role: UserRole.ADMIN,
      });

      await expect(
        service.updateStaff(mockCurrentAdmin, 3, { role: UserRole.TEACHER }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('실장(ADMIN)이 동료 실장의 이름/연락처만 바꾸는 건(role 필드 없음) 허용된다', async () => {
      const mockCurrentAdmin = { ...mockCurrentOwner, role: UserRole.ADMIN };
      const coAdmin = { ...mockTeacher, id: 3, role: UserRole.ADMIN };
      prisma.user.findFirst.mockResolvedValue(coAdmin);
      prisma.user.update.mockResolvedValue({ ...coAdmin, phone: '010-0000-0000' });

      const result = await service.updateStaff(mockCurrentAdmin, 3, {
        phone: '010-0000-0000',
      });

      expect(result.phone).toBe('010-0000-0000');
    });

    it('원장(OWNER)은 실장의 직책을 변경할 수 있다', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockTeacher,
        id: 3,
        role: UserRole.ADMIN,
      });
      prisma.user.update.mockResolvedValue({
        ...mockTeacher,
        id: 3,
        role: UserRole.TEACHER,
      });

      const result = await service.updateStaff(mockCurrentOwner, 3, {
        role: UserRole.TEACHER,
      });

      expect(result.role).toBe(UserRole.TEACHER);
    });
  });

  describe('resetStaffPassword', () => {
    it('강사/조교 비밀번호를 초기화하고 임시 비밀번호를 1회 반환하며 강제 로그아웃시킨다', async () => {
      prisma.user.findFirst.mockResolvedValue(mockTeacher);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedTempPw');
      prisma.user.update.mockResolvedValue({
        ...mockTeacher,
        password: 'newHashedTempPw',
        mustChangePassword: true,
      });

      const result = await service.resetStaffPassword(mockCurrentOwner, 2);

      expect(result.tempPassword).toBeDefined();
      expect(result.tempPassword).toMatch(
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          password: 'newHashedTempPw',
          mustChangePassword: true,
          hashedRefreshToken: null,
        },
      });
    });

    it.each([UserRole.OWNER, UserRole.ADMIN])(
      '대상이 %s면 ForbiddenException 발생 (교직원 관리에서 초기화 불가)',
      async (role) => {
        prisma.user.findFirst.mockResolvedValue({ ...mockTeacher, role });

        await expect(
          service.resetStaffPassword(mockCurrentOwner, 2),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.user.update).not.toHaveBeenCalled();
      },
    );

    it('대상이 없으면 NotFoundException 발생', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetStaffPassword(mockCurrentOwner, 999),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateStaff', () => {
    it('교직원을 퇴사 처리(status=INACTIVE)하고 강제 로그아웃시킨다', async () => {
      prisma.user.findFirst.mockResolvedValue(mockTeacher);
      prisma.user.update.mockResolvedValue({
        ...mockTeacher,
        status: UserStatus.INACTIVE,
      });

      const result = await service.deactivateStaff(mockCurrentOwner, 2);

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { status: UserStatus.INACTIVE, hashedRefreshToken: null },
      });
    });

    it('대상이 원장(OWNER)이면 ForbiddenException 발생', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, id: 1 });

      await expect(
        service.deactivateStaff(mockCurrentOwner, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('본인 계정을 대상으로 하면 ForbiddenException 발생', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockTeacher,
        id: mockCurrentOwner.userId,
      });

      await expect(
        service.deactivateStaff(mockCurrentOwner, mockCurrentOwner.userId),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('학원코드 자가입', () => {
    it('generateStaffJoinCode: 코드를 새로 발급한다', async () => {
      prisma.academy.update.mockResolvedValue({ staffJoinCode: 'newcode' });

      const result = await service.generateStaffJoinCode(10);

      expect(result.staffJoinCode).toBeDefined();
      expect(prisma.academy.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { staffJoinCode: result.staffJoinCode },
      });
    });

    it('getStaffJoinCode: 발급된 적 없으면 null 반환', async () => {
      prisma.academy.findUnique.mockResolvedValue({ staffJoinCode: null });

      const result = await service.getStaffJoinCode(10);

      expect(result.staffJoinCode).toBeNull();
    });

    it('joinStaffByCode: 유효한 코드로 즉시 가입 및 토큰 발급 성공', async () => {
      prisma.academy.findUnique.mockResolvedValue({
        ...mockUser.academy,
        status: 'ACTIVE',
        subscription: null,
      });
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      prisma.user.create.mockResolvedValue({
        ...mockTeacher,
        mustChangePassword: false,
      });
      prisma.user.update.mockResolvedValue(mockTeacher);

      const result = await service.joinStaffByCode({
        code: 'valid-code',
        email: 'teacher@classhelper.kr',
        password: 'Password123!',
        name: '이강사',
        role: UserRole.TEACHER,
      });

      expect(result.accessToken).toBe('mocked-access-token');
      expect(result.user.mustChangePassword).toBe(false);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            academyId: mockUser.academy.id,
            role: UserRole.TEACHER,
            mustChangePassword: false,
          }),
        }),
      );
    });

    it('joinStaffByCode: 유효하지 않은 코드면 NotFoundException 발생', async () => {
      prisma.academy.findUnique.mockResolvedValue(null);

      await expect(
        service.joinStaffByCode({
          code: 'invalid-code',
          email: 'teacher@classhelper.kr',
          password: 'Password123!',
          name: '이강사',
          role: UserRole.TEACHER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('joinStaffByCode: 이미 사용 중인 이메일이면 ConflictException 발생', async () => {
      prisma.academy.findUnique.mockResolvedValue({
        ...mockUser.academy,
        status: 'ACTIVE',
      });
      prisma.user.findUnique.mockResolvedValue(mockTeacher);

      await expect(
        service.joinStaffByCode({
          code: 'valid-code',
          email: 'teacher@classhelper.kr',
          password: 'Password123!',
          name: '이강사',
          role: UserRole.TEACHER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
