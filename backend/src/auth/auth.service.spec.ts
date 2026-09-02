import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  const mockUser = {
    id: 1,
    academyId: 10,
    email: 'owner@classhelper.kr',
    password: 'hashedPassword',
    name: '김원장',
    phone: '010-1234-5678',
    role: UserRole.OWNER,
    hashedRefreshToken: 'hashed_refresh_token_value',
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
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      academy: {
        create: jest.fn(),
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
});
