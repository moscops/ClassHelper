import { ApiProperty } from '@nestjs/swagger';

export class DailyAttendanceStatDto {
  @ApiProperty({ example: '2026-08-27' })
  date: string;

  @ApiProperty({ example: 45 })
  total: number;

  @ApiProperty({ example: 40 })
  present: number;

  @ApiProperty({ example: 3 })
  absent: number;

  @ApiProperty({ example: 2 })
  late: number;

  @ApiProperty({ example: 0 })
  earlyLeave: number;

  @ApiProperty({ example: 88.9, description: '출석률 (%)' })
  attendanceRate: number;
}

export class AttendanceStatsResponseDto {
  @ApiProperty({ example: '2026-08-01' })
  startDate: string;

  @ApiProperty({ example: '2026-08-27' })
  endDate: string;

  @ApiProperty({ example: 120, description: '총 출결 기록 수' })
  totalRecords: number;

  @ApiProperty({ example: 105, description: '총 출석 수' })
  totalPresent: number;

  @ApiProperty({ example: 8, description: '총 결석 수' })
  totalAbsent: number;

  @ApiProperty({ example: 5, description: '총 지각 수' })
  totalLate: number;

  @ApiProperty({ example: 2, description: '총 조퇴 수' })
  totalEarlyLeave: number;

  @ApiProperty({ example: 87.5, description: '평균 출석률 (%)' })
  averageAttendanceRate: number;

  @ApiProperty({ example: 4, description: '보강 필요 건수' })
  makeupNeededCount: number;

  @ApiProperty({ example: 2, description: '보강 완료 건수' })
  makeupCompletedCount: number;

  @ApiProperty({
    description: '일자별 출결 통계 추이',
    type: [DailyAttendanceStatDto],
  })
  dailyStats: DailyAttendanceStatDto[];
}
