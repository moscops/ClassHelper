import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // 실제 Access/Refresh 토큰 서명은 auth.service.ts의 getTokens()에서
        // 각각 JWT_ACCESS_SECRET/JWT_REFRESH_SECRET을 명시적으로 지정해 수행한다.
        // 여기서는 JwtModule 등록에 필요한 기본값만 안전하게 채운다(하드코딩된
        // 시크릿으로 조용히 fallback하지 않음 — 없으면 ConfigModule 부팅 검증에서 이미 실패함).
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_ACCESS_EXPIRES_IN') ||
            '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
