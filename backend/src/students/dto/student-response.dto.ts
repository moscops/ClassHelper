import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, StudentStatus, EnrollmentStatus } from '@prisma/client';

export class StudentResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  academyId: number;

  @ApiProperty({ example: '홍길동' })
  name: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  gender?: Gender | null;

  @ApiPropertyOptional({ example: '2012-05-15' })
  birthDate?: Date | null;

  @ApiPropertyOptional({ example: '서울초등학교' })
  schoolName?: string | null;

  @ApiPropertyOptional({ example: '초6' })
  grade?: string | null;

  @ApiPropertyOptional({ example: '010-1111-2222' })
  studentPhone?: string | null;

  @ApiProperty({ example: '010-3333-4444' })
  parentPhone: string;

  @ApiPropertyOptional({ example: '홍판서' })
  parentName?: string | null;

  @ApiPropertyOptional({ example: '모' })
  parentRelationship?: string | null;

  @ApiProperty({ enum: StudentStatus, example: StudentStatus.ACTIVE })
  status: StudentStatus;

  @ApiPropertyOptional({ example: '2026-08-18' })
  enrolledAt?: Date | null;

  @ApiPropertyOptional({ example: null })
  dischargedAt?: Date | null;

  @ApiPropertyOptional({ example: '특이사항 메모' })
  memo?: string | null;

  @ApiPropertyOptional({
    description: '현재 수강 중인 수업 반 목록 요약',
    example: [{ id: 1, name: '중등 수학 심화반', subject: '수학' }],
  })
  enrolledClasses?: Array<{
    id: number;
    name: string;
    subject?: string | null;
  }>;

  @ApiProperty({ example: '2026-08-18T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-18T00:00:00.000Z' })
  updatedAt: Date;
}

export class StudentClassSummaryDto {
  @ApiProperty({ example: 1 })
  enrollmentId: number;

  @ApiProperty({ example: 5 })
  classId: number;

  @ApiProperty({ example: '중등 수학 심화반' })
  className: string;

  @ApiPropertyOptional({ example: '수학' })
  subject?: string | null;

  @ApiPropertyOptional({ example: '이강사' })
  teacherName?: string | null;

  @ApiProperty({ enum: EnrollmentStatus, example: EnrollmentStatus.ENROLLED })
  status: EnrollmentStatus;

  @ApiProperty({ example: '2026-08-01' })
  startDate: Date;
}

export class StudentDetailResponseDto extends StudentResponseDto {
  @ApiProperty({
    type: [StudentClassSummaryDto],
    description: '현재 수강 중인 반 목록',
  })
  classes: StudentClassSummaryDto[];
}

export class PaginationMetaDto {
  @ApiProperty({ example: 45 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class PaginatedStudentResponseDto {
  @ApiProperty({ type: [StudentResponseDto] })
  items: StudentResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
