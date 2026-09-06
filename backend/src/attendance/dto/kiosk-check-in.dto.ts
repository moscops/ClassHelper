import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { QuickCheckType } from './quick-check.dto';

export class KioskCheckInDto {
  @ApiProperty({
    description: '학원별로 발급된 키오스크 접속 토큰',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty()
  kioskToken: string;

  @ApiProperty({
    description:
      'lookup에서 입력했던 전화번호 뒷자리 4자리. studentId를 그대로 신뢰하지 않고 ' +
      '서버에서 재검증하기 위한 값 (studentId는 추측 가능한 순차 ID이므로 필수).',
    example: '1234',
  })
  @Matches(/^\d{4}$/, {
    message: '전화번호 뒷자리 4자리 숫자를 입력해주세요.',
  })
  phoneLast4: string;

  @ApiProperty({
    description: '/attendance/kiosk/lookup 응답에서 확인한 학생 ID',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  studentId: number;

  @ApiProperty({
    description: '/attendance/kiosk/lookup 응답에서 확인한 수업 반 ID',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  classId: number;

  @ApiProperty({
    description: '등/하원 유형',
    enum: QuickCheckType,
    example: QuickCheckType.CHECK_IN,
  })
  @IsEnum(QuickCheckType)
  type: QuickCheckType;
}
