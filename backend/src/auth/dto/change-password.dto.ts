import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: '현재 비밀번호 (본인 확인용)',
    example: 'Teacher123!',
  })
  @IsString()
  @IsNotEmpty({ message: '현재 비밀번호를 입력해주세요.' })
  currentPassword: string;

  @ApiProperty({
    description: '새 비밀번호 (8자 이상, 영문/숫자/특수문자 포함)',
    example: 'NewTeacher456!',
  })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @Matches(
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/,
    {
      message:
        '비밀번호는 영문, 숫자, 특수문자(!@#$%^&* 등)를 모두 포함하여 8자 이상이어야 합니다.',
    },
  )
  newPassword: string;
}
