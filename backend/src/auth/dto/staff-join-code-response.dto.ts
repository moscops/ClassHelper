import { ApiProperty } from '@nestjs/swagger';

export class StaffJoinCodeResponseDto {
  @ApiProperty({
    description:
      '교직원 학원코드 자가입용 코드. 발급/재발급(POST) 응답에서는 항상 값이 존재하고, ' +
      '조회(GET) 응답에서는 아직 한 번도 발급된 적이 없으면 null.',
    example: 'a1b2c3d4e5f6...',
    nullable: true,
  })
  staffJoinCode: string | null;
}
