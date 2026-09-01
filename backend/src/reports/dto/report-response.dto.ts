import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttendanceStatsDto {
  @ApiProperty({ example: 20 })
  totalDays: number;

  @ApiProperty({ example: 18 })
  presentCount: number;

  @ApiProperty({ example: 1 })
  absentCount: number;

  @ApiProperty({ example: 1 })
  lateCount: number;

  @ApiProperty({ example: 0 })
  earlyLeaveCount: number;

  @ApiProperty({ example: 90.0 })
  attendanceRate: number;
}

export class HomeworkStatsDto {
  @ApiProperty({ example: 10 })
  totalAssignments: number;

  @ApiProperty({ example: 8 })
  completedAssignments: number;

  @ApiProperty({ example: 80.0 })
  completionRate: number;

  @ApiPropertyOptional({ example: 92.5 })
  averageScore: number | null;
}

export class StudentReportDto {
  @ApiProperty({ example: 1 })
  studentId: number;

  @ApiProperty({ example: '김민준' })
  studentName: string;

  @ApiProperty({ example: '2026-09-01' })
  periodStart: string;

  @ApiProperty({ example: '2026-09-30' })
  periodEnd: string;

  @ApiProperty({ type: AttendanceStatsDto })
  attendance: AttendanceStatsDto;

  @ApiProperty({ type: HomeworkStatsDto })
  homework: HomeworkStatsDto;

  @ApiProperty({ description: '카카오 발송용 리포트 본문' })
  message: string;
}

export class SendReportResultDto extends StudentReportDto {
  @ApiProperty({ example: '010-1234-5678' })
  sentTo: string;

  @ApiProperty({ example: 101 })
  notificationId: number;
}

export class ClassReportFailureDto {
  @ApiProperty({ example: 5 })
  studentId: number;

  @ApiProperty({ example: '이서연' })
  studentName: string;

  @ApiProperty({ example: '해당 기간에 출결/과제 데이터가 없습니다.' })
  reason: string;
}

export class ClassReportSendResultDto {
  @ApiProperty({ example: 3 })
  classId: number;

  @ApiProperty({ example: '중등 수학 심화반' })
  className: string;

  @ApiProperty({ example: '2026-09-01' })
  periodStart: string;

  @ApiProperty({ example: '2026-09-30' })
  periodEnd: string;

  @ApiProperty({ example: 12 })
  totalStudents: number;

  @ApiProperty({ example: 11 })
  sentCount: number;

  @ApiProperty({ example: 1 })
  failedCount: number;

  @ApiProperty({ type: [SendReportResultDto] })
  results: SendReportResultDto[];

  @ApiProperty({ type: [ClassReportFailureDto] })
  failed: ClassReportFailureDto[];
}
