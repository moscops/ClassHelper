import { ApiProperty } from '@nestjs/swagger';

export class KioskTokenResponseDto {
  @ApiProperty({
    description:
      '키오스크 접속 토큰. 발급/재발급(POST) 응답에서는 항상 값이 존재하고, ' +
      '조회(GET) 응답에서는 아직 한 번도 발급된 적이 없으면 null.',
    example: 'a1b2c3d4e5f6...',
    nullable: true,
  })
  kioskToken: string | null;
}
