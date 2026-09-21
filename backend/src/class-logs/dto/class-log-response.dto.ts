import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HomeworkStatus } from '@prisma/client';

export class HomeworkSubmissionStudentDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '김민준' })
  name: string;

  @ApiPropertyOptional({ example: '중2' })
  grade?: string | null;

  @ApiPropertyOptional({ example: '010-1111-2222' })
  studentPhone?: string | null;

  @ApiProperty({ example: '010-1234-5678' })
  parentPhone: string;

  @ApiPropertyOptional({ example: '김학부모' })
  parentName?: string | null;
}

export class HomeworkSubmissionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  classLogId: number;

  @ApiProperty({ example: 1 })
  studentId: number;

  @ApiProperty({
    enum: HomeworkStatus,
    example: HomeworkStatus.COMPLETED,
  })
  status: HomeworkStatus;

  @ApiPropertyOptional({ example: 95 })
  score?: number | null;

  @ApiPropertyOptional({ example: '개념 이해도가 높고 풀이과정 우수' })
  feedback?: string | null;

  @ApiProperty({ example: '2026-08-30T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-30T10:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: HomeworkSubmissionStudentDto })
  student?: HomeworkSubmissionStudentDto;
}

export class ClassLogTeacherDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: '홍길동 강사' })
  name: string;

  @ApiProperty({ example: 'teacher@classhelper.com' })
  email: string;
}

export class ClassLogClassDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '중등 수학 심화반' })
  name: string;

  @ApiPropertyOptional({ example: '수학' })
  subject?: string | null;

  @ApiPropertyOptional({ example: '중2' })
  targetGrade?: string | null;

  @ApiPropertyOptional({ example: '월/수/금 17:00-19:00' })
  schedule?: string | null;
}

export class ClassLogResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  academyId: number;

  @ApiProperty({ example: 1 })
  classId: number;

  @ApiProperty({ example: 2 })
  teacherId: number;

  @ApiProperty({ example: '2026-08-30' })
  date: string;

  @ApiProperty({ example: '개념원리 수학(상) p.45~62 다항식의 연산' })
  curriculum: string;

  @ApiPropertyOptional({
    example: '다항식의 곱셈 공식 1~5번 암기 및 예제 풀이',
  })
  lessonContent?: string | null;

  @ApiPropertyOptional({ example: '워크북 p.20~24 풀기' })
  homework?: string | null;

  @ApiPropertyOptional({ example: '전원 집중도 양호' })
  notes?: string | null;

  @ApiProperty({ example: '2026-08-30T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-08-30T10:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: ClassLogClassDto })
  class?: ClassLogClassDto;

  @ApiPropertyOptional({ type: ClassLogTeacherDto })
  teacher?: ClassLogTeacherDto;

  @ApiPropertyOptional({ type: [HomeworkSubmissionResponseDto] })
  homeworkSubmissions?: HomeworkSubmissionResponseDto[];

  @ApiPropertyOptional({ example: 10, description: '전체 과제 대상 원생 수' })
  totalStudents?: number;

  @ApiPropertyOptional({ example: 8, description: '과제 완료 원생 수' })
  completedCount?: number;

  @ApiPropertyOptional({ example: 1, description: '과제 미흡 원생 수' })
  incompleteCount?: number;

  @ApiPropertyOptional({ example: 1, description: '과제 미제출 원생 수' })
  notSubmittedCount?: number;

  @ApiPropertyOptional({ example: 0, description: '과제 면제 원생 수' })
  excusedCount?: number;

  @ApiPropertyOptional({ example: 80.0, description: '과제 완료율 (%)' })
  completionRate?: number;

  @ApiPropertyOptional({ example: 92.5, description: '과제 평균 점수' })
  averageScore?: number;
}

export class PaginatedClassLogsResponseDto {
  @ApiProperty({ type: [ClassLogResponseDto] })
  items: ClassLogResponseDto[];

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 2 })
  totalPages: number;
}

export class StudentHomeworkHistoryItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  classLogId: number;

  @ApiProperty({ example: '2026-08-30' })
  date: string;

  @ApiProperty({ example: '중등 수학 심화반' })
  className: string;

  @ApiProperty({ example: '홍길동 강사' })
  teacherName: string;

  @ApiProperty({ example: '개념원리 수학(상) p.45~62' })
  curriculum: string;

  @ApiPropertyOptional({ example: '워크북 p.20~24' })
  homework?: string | null;

  @ApiProperty({
    enum: HomeworkStatus,
    example: HomeworkStatus.COMPLETED,
  })
  status: HomeworkStatus;

  @ApiPropertyOptional({ example: 100 })
  score?: number | null;

  @ApiPropertyOptional({ example: '훌륭함' })
  feedback?: string | null;
}

export class StudentHomeworkHistoryResponseDto {
  @ApiProperty({ example: 1 })
  studentId: number;

  @ApiProperty({ example: '김민준' })
  studentName: string;

  @ApiProperty({ example: 15, description: '전체 과제 수' })
  totalAssignments: number;

  @ApiProperty({ example: 13, description: '완료한 과제 수' })
  completedAssignments: number;

  @ApiProperty({ example: 86.7, description: '누적 과제 완성률 (%)' })
  completionRate: number;

  @ApiPropertyOptional({ example: 94.2, description: '평균 과제 점수' })
  averageScore?: number | null;

  @ApiProperty({ type: [StudentHomeworkHistoryItemDto] })
  history: StudentHomeworkHistoryItemDto[];
}
