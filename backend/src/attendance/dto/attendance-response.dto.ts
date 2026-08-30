import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceStudentSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '김민준' })
  name: string;

  @ApiPropertyOptional({ example: '중2' })
  grade?: string | null;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  studentPhone?: string | null;

  @ApiProperty({ example: '010-9876-5432' })
  parentPhone: string;

  @ApiPropertyOptional({ example: '김학부모' })
  parentName?: string | null;
}

export class AttendanceClassSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '중등 수학 심화반' })
  name: string;

  @ApiPropertyOptional({ example: '수학' })
  subject?: string | null;

  @ApiPropertyOptional({ example: '월/수/금 17:00-19:00' })
  schedule?: string | null;
}

export class AttendanceResponseDto {
  @ApiProperty({
    description: '출결 기록 고유 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '학원 ID',
    example: 1,
  })
  academyId: number;

  @ApiProperty({
    description: '수강생 ID',
    example: 1,
  })
  studentId: number;

  @ApiProperty({
    description: '수업 반 ID',
    example: 1,
  })
  classId: number;

  @ApiProperty({
    description: '출결 기준 일자 (YYYY-MM-DD)',
    example: '2026-08-27',
  })
  date: string;

  @ApiProperty({
    description: '출결 상태',
    enum: AttendanceStatus,
    example: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @ApiPropertyOptional({
    description: '등원 시각 (ISO 8601 문자열)',
    example: '2026-08-27T17:30:00.000Z',
  })
  checkInTime?: string | null;

  @ApiPropertyOptional({
    description: '하원 시각 (ISO 8601 문자열)',
    example: '2026-08-27T19:00:00.000Z',
  })
  checkOutTime?: string | null;

  @ApiPropertyOptional({
    description: '지각/결석/조퇴 사유',
    example: '병원 진료',
  })
  reason?: string | null;

  @ApiProperty({
    description: '보강 수업 필요 여부',
    example: false,
  })
  isMakeupNeeded: boolean;

  @ApiProperty({
    description: '보강 수업 완료 여부',
    example: false,
  })
  isMakeupCompleted: boolean;

  @ApiPropertyOptional({
    description: '출결 메모',
    example: '특이사항 메모',
  })
  memo?: string | null;

  @ApiProperty({
    description: '생성 일시',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '수강생 정보',
    type: AttendanceStudentSummaryDto,
  })
  student?: AttendanceStudentSummaryDto;

  @ApiPropertyOptional({
    description: '수업 반 정보',
    type: AttendanceClassSummaryDto,
  })
  class?: AttendanceClassSummaryDto;
}

export class PaginatedAttendanceResponseDto {
  @ApiProperty({
    description: '출결 기록 목록',
    type: [AttendanceResponseDto],
  })
  data: AttendanceResponseDto[];

  @ApiProperty({
    description: '전체 데이터 건수',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: '현재 페이지',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '페이지 당 조회 건수',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: '전체 페이지 수',
    example: 5,
  })
  totalPages: number;
}

export class ClassRosterStudentDto {
  @ApiProperty({ example: 1 })
  studentId: number;

  @ApiProperty({ example: '김민준' })
  studentName: string;

  @ApiPropertyOptional({ example: '중2' })
  grade?: string | null;

  @ApiPropertyOptional({ example: '010-1234-5678' })
  studentPhone?: string | null;

  @ApiProperty({ example: '010-9876-5432' })
  parentPhone: string;

  @ApiPropertyOptional({ example: '김학부모' })
  parentName?: string | null;

  @ApiPropertyOptional({
    description: '해당 일자 출결 기록 (미입력 시 null)',
    type: AttendanceResponseDto,
  })
  attendance?: AttendanceResponseDto | null;
}

export class ClassDailyRosterResponseDto {
  @ApiProperty({
    description: '수업 반 정보',
    type: AttendanceClassSummaryDto,
  })
  class: AttendanceClassSummaryDto;

  @ApiProperty({
    description: '출결 기준 일자 (YYYY-MM-DD)',
    example: '2026-08-27',
  })
  date: string;

  @ApiProperty({
    description: '총 수강 인원 수',
    example: 15,
  })
  totalStudents: number;

  @ApiProperty({
    description: '출석 인원 수 (PRESENT)',
    example: 12,
  })
  presentCount: number;

  @ApiProperty({
    description: '결석 인원 수 (ABSENT)',
    example: 1,
  })
  absentCount: number;

  @ApiProperty({
    description: '지각 인원 수 (LATE)',
    example: 1,
  })
  lateCount: number;

  @ApiProperty({
    description: '조퇴 인원 수 (EARLY_LEAVE)',
    example: 0,
  })
  earlyLeaveCount: number;

  @ApiProperty({
    description: '미체크 인원 수',
    example: 1,
  })
  unmarkedCount: number;

  @ApiProperty({
    description: '수강생별 출결 현황 목록',
    type: [ClassRosterStudentDto],
  })
  students: ClassRosterStudentDto[];
}

export class UnattendedStudentDto {
  @ApiProperty({ example: 1 })
  studentId: number;

  @ApiProperty({ example: '김민준' })
  studentName: string;

  @ApiPropertyOptional({ example: '중2' })
  grade?: string | null;

  @ApiProperty({ example: '010-1234-5678' })
  parentPhone: string;

  @ApiPropertyOptional({ example: '010-9876-5432' })
  studentPhone?: string | null;

  @ApiProperty({ example: 1 })
  classId: number;

  @ApiProperty({ example: '중등 수학 심화반' })
  className: string;

  @ApiPropertyOptional({ example: '17:00-19:00' })
  schedule?: string | null;

  @ApiProperty({
    description: '이미 카카오 알림톡/SMS가 발송되었는지 여부',
    example: true,
  })
  isAlertSent: boolean;

  @ApiPropertyOptional({ example: '2026-08-30T17:10:00.000Z' })
  alertSentAt?: Date | null;
}

export class UnattendedStatusResponseDto {
  @ApiProperty({
    description:
      '출결 체크 버튼 경고 신호(펄스 효과) 활성화 여부 (미등원생 존재 시 true)',
    example: true,
  })
  isUnattendedAlertActive: boolean;

  @ApiProperty({
    description: '미등원 수강생 총 인원 수',
    example: 2,
  })
  unattendedCount: number;

  @ApiProperty({
    description: '오늘 미등원 수강생 목록',
    type: [UnattendedStudentDto],
  })
  unattendedStudents: UnattendedStudentDto[];
}
