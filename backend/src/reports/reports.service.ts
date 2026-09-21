import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import {
  NotificationType,
  NotificationChannel,
  EnrollmentStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { ClassLogsService } from '../class-logs/class-logs.service';
import { ClassesService } from '../classes/classes.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  StudentReportDto,
  SendReportResultDto,
  ClassReportSendResultDto,
} from './dto/report-response.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
    private readonly classLogsService: ClassLogsService,
    private readonly classesService: ClassesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 1. 원생 리포트 생성 (미리보기 — 발송하지 않음)
   *
   * 출결(AttendanceService)과 과제(ClassLogsService)의 기존 통계 로직을 재사용하여
   * 기간별 리포트 데이터와 카카오 발송용 메시지 본문을 만든다.
   */
  async generateReport(
    academyId: number,
    studentId: number,
    periodStart: string,
    periodEnd: string,
  ): Promise<StudentReportDto> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, academyId },
    });
    if (!student) {
      throw new NotFoundException('해당 원생을 찾을 수 없습니다.');
    }

    const [attendance, homework] = await Promise.all([
      this.attendanceService.getStudentAttendanceStats(
        academyId,
        studentId,
        periodStart,
        periodEnd,
      ),
      this.classLogsService.getStudentHomeworkStats(
        academyId,
        studentId,
        periodStart,
        periodEnd,
      ),
    ]);

    const message = this.formatReportMessage(
      student.name,
      periodStart,
      periodEnd,
      attendance,
      homework,
    );

    return {
      studentId: student.id,
      studentName: student.name,
      periodStart,
      periodEnd,
      attendance,
      homework,
      message,
    };
  }

  /**
   * 2. 원생 리포트 생성 및 카카오 발송
   */
  async sendStudentReport(
    academyId: number,
    studentId: number,
    periodStart: string,
    periodEnd: string,
    customMessage?: string,
  ): Promise<SendReportResultDto> {
    const report = await this.generateReport(
      academyId,
      studentId,
      periodStart,
      periodEnd,
    );

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, academyId },
      select: { parentPhone: true },
    });
    if (!student) {
      throw new NotFoundException('해당 원생을 찾을 수 없습니다.');
    }

    const finalMessage = customMessage?.trim() || report.message;

    const notification = await this.notificationsService.createNotification(
      academyId,
      {
        studentId,
        type: NotificationType.STUDENT_REPORT,
        channel: NotificationChannel.KAKAO,
        title: `${report.studentName} 학생 리포트`,
        message: finalMessage,
        targetPhone: student.parentPhone,
      },
    );

    this.logger.log(
      `원생 리포트 발송: [${report.studentName}] ${periodStart}~${periodEnd} - 학원 ${academyId}`,
    );

    return {
      ...report,
      message: finalMessage,
      sentTo: student.parentPhone,
      notificationId: notification.id,
    };
  }

  /**
   * 3. 반 전체 리포트 일괄 생성 및 발송
   *
   * 원생 한 명의 발송 실패가 나머지 발송을 막지 않도록 개별 try/catch로 처리한다
   * (bulk-import 도메인과 동일한 부분 성공 철학).
   */
  async sendClassReports(
    academyId: number,
    classId: number,
    periodStart: string,
    periodEnd: string,
    customMessage?: string,
  ): Promise<ClassReportSendResultDto> {
    const classInfo = await this.prisma.class.findFirst({
      where: { id: classId, academyId },
      select: { name: true },
    });
    if (!classInfo) {
      throw new NotFoundException('해당 수업 반을 찾을 수 없습니다.');
    }

    const enrollments = await this.classesService.getEnrolledStudents(
      academyId,
      classId,
      EnrollmentStatus.ENROLLED,
    );

    const results: SendReportResultDto[] = [];
    const failed: { studentId: number; studentName: string; reason: string }[] =
      [];

    for (const enr of enrollments) {
      try {
        const result = await this.sendStudentReport(
          academyId,
          enr.student.id,
          periodStart,
          periodEnd,
          customMessage,
        );
        results.push(result);
      } catch (error) {
        failed.push({
          studentId: enr.student.id,
          studentName: enr.student.name,
          reason:
            error instanceof Error
              ? error.message
              : '리포트 발송 중 오류가 발생했습니다.',
        });
      }
    }

    this.logger.log(
      `반 리포트 일괄 발송: [${classInfo.name}] 성공 ${results.length} / 실패 ${failed.length} (총 ${enrollments.length}명)`,
    );

    return {
      classId,
      className: classInfo.name,
      periodStart,
      periodEnd,
      totalStudents: enrollments.length,
      sentCount: results.length,
      failedCount: failed.length,
      results,
      failed,
    };
  }

  /**
   * Helper: 카카오 발송용 리포트 메시지 본문 생성
   */
  private formatReportMessage(
    studentName: string,
    periodStart: string,
    periodEnd: string,
    attendance: {
      totalDays: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      earlyLeaveCount: number;
      attendanceRate: number;
    },
    homework: {
      totalAssignments: number;
      completedAssignments: number;
      completionRate: number;
      averageScore: number | null;
    },
  ): string {
    const scoreLine =
      homework.averageScore !== null
        ? `- 평균 점수: ${homework.averageScore}점\n`
        : '';

    return (
      `[${studentName} 학생 리포트]\n` +
      `📅 기간: ${periodStart} ~ ${periodEnd}\n\n` +
      `✅ 출결 현황\n` +
      `- 출석: ${attendance.presentCount}일 / ${attendance.totalDays}일 (${attendance.attendanceRate}%)\n` +
      `- 지각 ${attendance.lateCount}회 · 결석 ${attendance.absentCount}회 · 조퇴 ${attendance.earlyLeaveCount}회\n\n` +
      `📝 과제 수행\n` +
      `- 완료: ${homework.completedAssignments}건 / ${homework.totalAssignments}건 (${homework.completionRate}%)\n` +
      scoreLine +
      `\n궁금하신 점은 학원으로 문의해주세요.`
    );
  }
}
