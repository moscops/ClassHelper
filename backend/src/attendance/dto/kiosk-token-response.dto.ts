import { ApiProperty } from '@nestjs/swagger';

export class KioskTokenResponseDto {
  @ApiProperty({
    description:
      '새로 발급된 키오스크 접속 토큰 (재발급 시 기존 토큰은 즉시 무효화됨)',
    example: 'a1b2c3d4e5f6...',
  })
  kioskToken: string;
}
