import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ClassStatus } from '@prisma/client';

export class CreateClassDto {
  @ApiProperty({
    description: '수업 반 명칭',
    example: '중등 수학 심화A반',
    maxLength: 100,
  })
  @IsString({ message: '반 명칭은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '반 명칭을 입력해주세요.' })
  @MaxLength(100, { message: '반 명칭은 최대 100자까지 가능합니다.' })
  name: string;

  @ApiPropertyOptional({
    description: '과목명',
    example: '수학',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  subject?: string;

  @ApiPropertyOptional({
    description: '대상 학년',
    example: '중2',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  targetGrade?: string;

  @ApiPropertyOptional({
    description: '담당 강사 User ID',
    example: 2,
  })
  @IsOptional()
  @IsInt({ message: '강사 ID는 정수여야 합니다.' })
  teacherId?: number;

  @ApiPropertyOptional({
    description: '주간 수업 시간표',
    example: '월/수/금 17:00-19:00',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  schedule?: string;

  @ApiPropertyOptional({
    description: '수강 정원 (최대 인원)',
    example: 15,
  })
  @IsOptional()
  @IsInt({ message: '수강 정원은 정수여야 합니다.' })
  @Min(1, { message: '수강 정원은 최소 1명 이상이어야 합니다.' })
  capacity?: number;

  @ApiPropertyOptional({
    description: '월 수강료 (기본 청구 금액)',
    example: 350000,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: '월 수강료는 숫자여야 합니다.' })
  @Min(0, { message: '수강료는 0원 이상이어야 합니다.' })
  monthlyFee?: number;

  @ApiPropertyOptional({
    description:
      '수업 운영 상태 (ACTIVE: 운영중, INACTIVE: 임시휴강, CLOSED: 폐강)',
    enum: ClassStatus,
    default: ClassStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ClassStatus, {
    message: '유효한 반 상태(ACTIVE, INACTIVE, CLOSED)를 입력해주세요.',
  })
  status?: ClassStatus;
}
