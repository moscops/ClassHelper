import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AcademyStatus } from '@prisma/client';

export class UpdateAcademyStatusDto {
  @ApiProperty({
    enum: AcademyStatus,
    description: '변경할 학원 상태',
    example: AcademyStatus.SUSPENDED,
  })
  @IsNotEmpty({ message: '학원 상태를 지정해주세요.' })
  @IsEnum(AcademyStatus, {
    message: '유효한 학원 상태(ACTIVE, SUSPENDED, PENDING)를 입력해주세요.',
  })
  status: AcademyStatus;

  @ApiProperty({
    description: '상태 변경 사유 (감사 로그 기록용)',
    example: '이용약관 위반 및 서비스 이용료 미납으로 인한 일시정지',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
