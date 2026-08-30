import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@prisma/client';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: number;
  academyId?: number | null;
  email: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        configService.get<string>('JWT_SECRET') ||
        'super-secret-classhelper-jwt-access-key',
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserPayload> {
    if (
      !payload.sub ||
      (!payload.academyId && payload.role !== UserRole.SUPER_ADMIN)
    ) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    return {
      userId: payload.sub,
      academyId: payload.academyId ?? null,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  }
}
