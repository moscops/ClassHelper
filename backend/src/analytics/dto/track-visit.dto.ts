import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TrackVisitDto {
  @ApiProperty({
    description:
      '프론트에서 생성해 로컬(localStorage 등)에 저장하는 익명 방문자 UUID. ' +
      '개인정보가 아니며, 같은 방문자가 재방문 시 동일 값을 재사용한다.',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
  })
  @IsUUID()
  visitorId: string;
}
