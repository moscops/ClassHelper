import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  const mockAuthResponse = {
    accessToken: 'mocked-access-token',
    refreshToken: 'mocked-refresh-token',
    user: {
      id: 1,
      academyId: 10,
      email: 'owner@classhelper.kr',
      name: '김원장',
      phone: '010-1234-5678',
      role: UserRole.OWNER,
      createdAt: new Date(),
    },
    academy: {
      id: 10,
      name: '클래스헬퍼 어학원',
      businessNumber: '123-45-67890',
      phoneNumber: '02-1234-5678',
      address: '서울시 강남구',
    },
  };

  beforeEach(async () => {
    authService = {
      registerOwner: jest.fn().mockResolvedValue(mockAuthResponse),
      registerStaff: jest.fn().mockResolvedValue(mockAuthResponse.user),
      login: jest.fn().mockResolvedValue(mockAuthResponse),
      refreshTokens: jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
      logout: jest.fn().mockResolvedValue({
        success: true,
        message: '성공적으로 로그아웃되었습니다.',
      }),
      getMe: jest.fn().mockResolvedValue({
        ...mockAuthResponse.user,
        academy: mockAuthResponse.academy,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('registerOwner 호출 시 서비스로 DTO를 전달하고 토큰 및 응답 반환', async () => {
    const dto = {
      academyName: '클래스헬퍼 어학원',
      email: 'owner@classhelper.kr',
      password: 'password123!',
      name: '김원장',
    };

    const result = await controller.registerOwner(dto);
    expect(authService.registerOwner).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockAuthResponse);
  });

  it('registerStaff 호출 시 서비스로 요청자 정보와 DTO를 전달', async () => {
    const currentUser = {
      userId: 1,
      academyId: 10,
      email: 'owner@classhelper.kr',
      name: '김원장',
      role: UserRole.OWNER,
    };
    const dto = {
      email: 'teacher@classhelper.kr',
      password: 'password123!',
      name: '이강사',
      role: UserRole.TEACHER,
    };

    const result = await controller.registerStaff(currentUser, dto);
    expect(authService.registerStaff).toHaveBeenCalledWith(currentUser, dto);
    expect(result).toEqual(mockAuthResponse.user);
  });

  it('login 호출 시 서비스로 DTO 전달 후 토큰 세트 반환', async () => {
    const dto = { email: 'owner@classhelper.kr', password: 'password123!' };
    const result = await controller.login(dto);
    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockAuthResponse);
  });

  it('refreshTokens 호출 시 Refresh Token DTO를 전달하고 새 토큰 세트 반환', async () => {
    const dto = { refreshToken: 'mocked-refresh-token' };
    const result = await controller.refreshTokens(dto);
    expect(authService.refreshTokens).toHaveBeenCalledWith(
      'mocked-refresh-token',
    );
    expect(result.accessToken).toBe('new-access-token');
  });

  it('logout 호출 시 유저 ID로 로그아웃 처리', async () => {
    const result = await controller.logout(1);
    expect(authService.logout).toHaveBeenCalledWith(1);
    expect(result.success).toBe(true);
  });

  it('getMe 호출 시 현재 로그인 유저 ID로 상세 정보 반환', async () => {
    const result = await controller.getMe(1);
    expect(authService.getMe).toHaveBeenCalledWith(1);
    expect(result.id).toBe(1);
    expect(result.academy.id).toBe(10);
  });
});
