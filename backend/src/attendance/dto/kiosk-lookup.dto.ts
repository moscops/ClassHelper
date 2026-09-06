import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class KioskLookupDto {
  @ApiProperty({
    description: '학원별로 발급된 키오스크 접속 토큰',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty()
  kioskToken: string;

  @ApiProperty({
    description: '학생 본인(없으면 보호자) 전화번호 뒷자리 4자리',
    example: '1234',
  })
  @Matches(/^\d{4}$/, {
    message: '전화번호 뒷자리 4자리 숫자를 입력해주세요.',
  })
  phoneLast4: string;
}
