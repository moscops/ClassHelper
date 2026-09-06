import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { QuickCheckDto, QuickCheckType } from './dto/quick-check.dto';
import { KioskLookupDto } from './dto/kiosk-lookup.dto';
import { KioskCheckInDto } from './dto/kiosk-check-in.dto';
import {
  KioskLookupResponseDto,
  KioskStudentMatchDto,
} from './dto/kiosk-response.dto';
import { KioskTokenResponseDto } from './dto/kiosk-token-response.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { AttendanceRosterQueryDto } from './dto/attendance-roster-query.dto';
import { AttendanceStatsQueryDto } from './dto/attendance-stats-query.dto';
import { UpdateMakeupDto } from './dto/update-makeup.dto';
import {
  AttendanceResponseDto,
  PaginatedAttendanceResponseDto,
  ClassDailyRosterResponseDto,
  ClassRosterStudentDto,
} from './dto/attendance-response.dto';
import {
  AttendanceStatsResponseDto,
  DailyAttendanceStatDto,
} from './dto/attendance-stats-response.dto';
import {
  UnattendedStatusResponseDto,
  UnattendedStudentDto,
} from './dto/attendance-response.dto';
import {
  AttendanceStatus,
  ClassStatus,
  EnrollmentStatus,
  NotificationChannel,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 1. 단일 출결 등록 및 수정 (Upsert)
   */
  async recordAttendance(
    academyId: number,
    dto: RecordAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    // 1) 학생 및 수업 반의 학원 소속 검증
    await this.validateStudentAndClass(academyId, dto.studentId, dto.classId);

    const parsedDate = this.parseDateOnly(dto.date);

    const checkInDateTime = dto.checkInTime ? new Date(dto.checkInTime) : null;
    const checkOutDateTime = dto.checkOutTime
      ? new Date(dto.checkOutTime)
      : null;

    const attendance = await this.prisma.attendance.upsert({
      where: {
        studentId_classId_date: {
          studentId: dto.studentId,
          classId: dto.classId,
          date: parsedDate,
        },
      },
      update: {
        status: dto.status,
        checkInTime: checkInDateTime,
        checkOutTime: checkOutDateTime,
        reason: dto.reason,
        isMakeupNeeded: dto.isMakeupNeeded ?? false,
        isMakeupCompleted: dto.isMakeupCompleted ?? false,
        memo: dto.memo,
      },
      create: {
        academyId,
        studentId: dto.studentId,
        classId: dto.classId,
        date: parsedDate,
        status: dto.status,
        checkInTime: checkInDateTime,
        checkOutTime: checkOutDateTime,
        reason: dto.reason,
        isMakeupNeeded: dto.isMakeupNeeded ?? false,
        isMakeupCompleted: dto.isMakeupCompleted ?? false,
        memo: dto.memo,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
            studentPhone: true,
            parentPhone: true,
            parentName: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            schedule: true,
          },
        },
      },
    });

    return this.mapToResponseDto(attendance);
  }

  /**
   * 2. 반 전체 1초 일괄 출결 체크 (Batch Upsert)
   */
  async batchRecordAttendance(
    academyId: number,
    dto: BatchAttendanceDto,
  ): Promise<AttendanceResponseDto[]> {
    // 1) 수업 반 소속 검증
    const classExists = await this.prisma.class.findFirst({
      where: { id: dto.classId, academyId },
    });
    if (!classExists) {
      throw new NotFoundException('해당 학원의 수업 반을 찾을 수 없습니다.');
    }

    if (!dto.records || dto.records.length === 0) {
      throw new BadRequestException('출결을 기록할 학생 목록이 비어 있습니다.');
    }

    const parsedDate = this.parseDateOnly(dto.date);

    // 2) 트랜잭션으로 일괄 Upsert 처리
    const results = await this.prisma.$transaction(async (tx) => {
      const updatedList = [];
      for (const record of dto.records) {
        // 학생 학원 소속 확인
        const student = await tx.student.findFirst({
          where: { id: record.studentId, academyId },
        });
        if (!student) {
          throw new BadRequestException(
            `수강생 ID ${record.studentId}는 해당 학원 소속이 아닙니다.`,
          );
        }

        const checkIn = record.checkInTime
          ? new Date(record.checkInTime)
          : null;
        const checkOut = record.checkOutTime
          ? new Date(record.checkOutTime)
          : null;

        const att = await tx.attendance.upsert({
          where: {
            studentId_classId_date: {
              studentId: record.studentId,
              classId: dto.classId,
              date: parsedDate,
            },
          },
          update: {
            status: record.status,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            reason: record.reason,
            isMakeupNeeded:
              record.isMakeupNeeded ??
              record.status === AttendanceStatus.ABSENT,
            memo: record.memo,
          },
          create: {
            academyId,
            studentId: record.studentId,
            classId: dto.classId,
            date: parsedDate,
            status: record.status,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            reason: record.reason,
            isMakeupNeeded:
              record.isMakeupNeeded ??
              record.status === AttendanceStatus.ABSENT,
            memo: record.memo,
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                grade: true,
                studentPhone: true,
                parentPhone: true,
                parentName: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                subject: true,
                schedule: true,
              },
            },
          },
        });
        updatedList.push(att);
      }
      return updatedList;
    });

    return results.map((r) => this.mapToResponseDto(r));
  }

  /**
   * 3. 1초 빠른 등원/하원 원터치 토글 (Quick Check-in / Check-out)
   */
  async quickCheck(
    academyId: number,
    dto: QuickCheckDto,
  ): Promise<AttendanceResponseDto> {
    await this.validateStudentAndClass(academyId, dto.studentId, dto.classId);

    const targetDateStr = dto.date || new Date().toISOString().slice(0, 10);
    const parsedDate = this.parseDateOnly(targetDateStr);
    const targetTime = dto.time ? new Date(dto.time) : new Date();

    const existing = await this.prisma.attendance.findUnique({
      where: {
        studentId_classId_date: {
          studentId: dto.studentId,
          classId: dto.classId,
          date: parsedDate,
        },
      },
    });

    let attendance;
    if (dto.type === QuickCheckType.CHECK_IN) {
      // 등원 처리
      if (existing) {
        attendance = await this.prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkInTime: targetTime,
            status:
              existing.status === AttendanceStatus.ABSENT
                ? AttendanceStatus.PRESENT
                : existing.status,
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                grade: true,
                studentPhone: true,
                parentPhone: true,
                parentName: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                subject: true,
                schedule: true,
              },
            },
          },
        });
      } else {
        attendance = await this.prisma.attendance.create({
          data: {
            academyId,
            studentId: dto.studentId,
            classId: dto.classId,
            date: parsedDate,
            status: AttendanceStatus.PRESENT,
            checkInTime: targetTime,
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                grade: true,
                studentPhone: true,
                parentPhone: true,
                parentName: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                subject: true,
                schedule: true,
              },
            },
          },
        });
      }
    } else {
      // 하원 처리 (CHECK_OUT)
      if (existing) {
        attendance = await this.prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkOutTime: targetTime,
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                grade: true,
                studentPhone: true,
                parentPhone: true,
                parentName: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                subject: true,
                schedule: true,
              },
            },
          },
        });
      } else {
        attendance = await this.prisma.attendance.create({
          data: {
            academyId,
            studentId: dto.studentId,
            classId: dto.classId,
            date: parsedDate,
            status: AttendanceStatus.PRESENT,
            checkInTime: targetTime,
            checkOutTime: targetTime,
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                grade: true,
                studentPhone: true,
                parentPhone: true,
                parentName: true,
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                subject: true,
                schedule: true,
              },
            },
          },
        });
      }
    }

    return this.mapToResponseDto(attendance);
  }

  /**
   * 4. 특정 반/일자의 전체 수강생 일별 출결 현황판 (Daily Roster)
   *    - 출결 체크를 아직 하지 않은 수강생도 포함하여 완벽한 출결 현황표 제공
   */
  async getClassDailyRoster(
    academyId: number,
    queryDto: AttendanceRosterQueryDto,
  ): Promise<ClassDailyRosterResponseDto> {
    const classInfo = await this.prisma.class.findFirst({
      where: { id: queryDto.classId, academyId },
      select: {
        id: true,
        name: true,
        subject: true,
        schedule: true,
      },
    });

    if (!classInfo) {
      throw new NotFoundException('해당 학원의 수업 반을 찾을 수 없습니다.');
    }

    const targetDateStr =
      queryDto.date || new Date().toISOString().slice(0, 10);
    const parsedDate = this.parseDateOnly(targetDateStr);

    // 1) 해당 반에 등록된 활성 수강생(Enrollment: ENROLLED) 조회
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        academyId,
        classId: queryDto.classId,
        status: EnrollmentStatus.ENROLLED,
        startDate: { lte: parsedDate },
        OR: [{ endDate: null }, { endDate: { gte: parsedDate } }],
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
            studentPhone: true,
            parentPhone: true,
            parentName: true,
          },
        },
      },
      orderBy: { student: { name: 'asc' } },
    });

    // 2) 해당 일자의 기존 출결 데이터 조회
    const attendances = await this.prisma.attendance.findMany({
      where: {
        academyId,
        classId: queryDto.classId,
        date: parsedDate,
      },
    });

    const attendanceMap = new Map<number, any>();
    attendances.forEach((att) => {
      attendanceMap.set(att.studentId, att);
    });

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;
    let unmarkedCount = 0;

    const studentRoster: ClassRosterStudentDto[] = enrollments.map((enr) => {
      const att = attendanceMap.get(enr.studentId);
      let attDto: AttendanceResponseDto | null = null;

      if (att) {
        attDto = this.mapToResponseDto(att);
        switch (att.status) {
          case AttendanceStatus.PRESENT:
            presentCount++;
            break;
          case AttendanceStatus.ABSENT:
            absentCount++;
            break;
          case AttendanceStatus.LATE:
            lateCount++;
            break;
          case AttendanceStatus.EARLY_LEAVE:
            earlyLeaveCount++;
            break;
        }
      } else {
        unmarkedCount++;
      }

      return {
        studentId: enr.student.id,
        studentName: enr.student.name,
        grade: enr.student.grade,
        studentPhone: enr.student.studentPhone,
        parentPhone: enr.student.parentPhone,
        parentName: enr.student.parentName,
        attendance: attDto,
      };
    });

    return {
      class: classInfo,
      date: targetDateStr,
      totalStudents: enrollments.length,
      presentCount,
      absentCount,
      lateCount,
      earlyLeaveCount,
      unmarkedCount,
      students: studentRoster,
    };
  }

  /**
   * 5. 출결 내역 다차원 검색 및 페이지네이션
   */
  async getAttendances(
    academyId: number,
    queryDto: QueryAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    const {
      classId,
      studentId,
      studentName,
      status,
      startDate,
      endDate,
      date,
      isMakeupNeeded,
      isMakeupCompleted,
      page = 1,
      limit = 20,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {
      academyId,
    };

    if (classId) {
      where.classId = classId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (studentName) {
      where.student = {
        name: { contains: studentName, mode: 'insensitive' },
      };
    }

    if (status) {
      where.status = status;
    }

    if (isMakeupNeeded !== undefined) {
      where.isMakeupNeeded = isMakeupNeeded;
    }

    if (isMakeupCompleted !== undefined) {
      where.isMakeupCompleted = isMakeupCompleted;
    }

    if (date) {
      where.date = this.parseDateOnly(date);
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = this.parseDateOnly(startDate);
      }
      if (endDate) {
        where.date.lte = this.parseDateOnly(endDate);
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        include: {
          student: {
            select: {
              id: true,
              name: true,
              grade: true,
              studentPhone: true,
              parentPhone: true,
              parentName: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              subject: true,
              schedule: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((item) => this.mapToResponseDto(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 6. 출결 통계 및 요약 분석
   */
  async getStats(
    academyId: number,
    queryDto: AttendanceStatsQueryDto,
  ): Promise<AttendanceStatsResponseDto> {
    const now = new Date();
    const firstDayOfMonth = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), 1),
    )
      .toISOString()
      .slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    const startDateStr = queryDto.startDate || firstDayOfMonth;
    const endDateStr = queryDto.endDate || todayStr;

    const where: Prisma.AttendanceWhereInput = {
      academyId,
      date: {
        gte: this.parseDateOnly(startDateStr),
        lte: this.parseDateOnly(endDateStr),
      },
    };

    if (queryDto.classId) {
      where.classId = queryDto.classId;
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalEarlyLeave = 0;
    let makeupNeededCount = 0;
    let makeupCompletedCount = 0;

    const dailyMap = new Map<
      string,
      {
        total: number;
        present: number;
        absent: number;
        late: number;
        earlyLeave: number;
      }
    >();

    for (const att of attendances) {
      const dateKey = att.date.toISOString().slice(0, 10);
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          earlyLeave: 0,
        });
      }
      const dayStat = dailyMap.get(dateKey)!;
      dayStat.total++;

      switch (att.status) {
        case AttendanceStatus.PRESENT:
          totalPresent++;
          dayStat.present++;
          break;
        case AttendanceStatus.ABSENT:
          totalAbsent++;
          dayStat.absent++;
          break;
        case AttendanceStatus.LATE:
          totalLate++;
          dayStat.late++;
          break;
        case AttendanceStatus.EARLY_LEAVE:
          totalEarlyLeave++;
          dayStat.earlyLeave++;
          break;
      }

      if (att.isMakeupNeeded) {
        makeupNeededCount++;
        if (att.isMakeupCompleted) {
          makeupCompletedCount++;
        }
      }
    }

    const dailyStats: DailyAttendanceStatDto[] = Array.from(
      dailyMap.entries(),
    ).map(([d, s]) => ({
      date: d,
      total: s.total,
      present: s.present,
      absent: s.absent,
      late: s.late,
      earlyLeave: s.earlyLeave,
      attendanceRate:
        s.total > 0 ? Number(((s.present / s.total) * 100).toFixed(1)) : 0,
    }));

    const totalRecords = attendances.length;
    const averageAttendanceRate =
      totalRecords > 0
        ? Number(((totalPresent / totalRecords) * 100).toFixed(1))
        : 0;

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      totalRecords,
      totalPresent,
      totalAbsent,
      totalLate,
      totalEarlyLeave,
      averageAttendanceRate,
      makeupNeededCount,
      makeupCompletedCount,
      dailyStats,
    };
  }

  /**
   * 6-1. 원생 리포트용: 특정 원생의 기간별 출결 통계 (리포트 도메인에서 사용)
   */
  async getStudentAttendanceStats(
    academyId: number,
    studentId: number,
    startDate: string,
    endDate: string,
  ): Promise<{
    totalDays: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    earlyLeaveCount: number;
    attendanceRate: number;
  }> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, academyId },
    });
    if (!student) {
      throw new NotFoundException('해당 학원의 수강생을 찾을 수 없습니다.');
    }

    const attendances = await this.prisma.attendance.findMany({
      where: {
        academyId,
        studentId,
        date: {
          gte: this.parseDateOnly(startDate),
          lte: this.parseDateOnly(endDate),
        },
      },
    });

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;

    for (const att of attendances) {
      switch (att.status) {
        case AttendanceStatus.PRESENT:
          presentCount++;
          break;
        case AttendanceStatus.ABSENT:
          absentCount++;
          break;
        case AttendanceStatus.LATE:
          lateCount++;
          break;
        case AttendanceStatus.EARLY_LEAVE:
          earlyLeaveCount++;
          break;
      }
    }

    const totalDays = attendances.length;
    const attendanceRate =
      totalDays > 0 ? Number(((presentCount / totalDays) * 100).toFixed(1)) : 0;

    return {
      totalDays,
      presentCount,
      absentCount,
      lateCount,
      earlyLeaveCount,
      attendanceRate,
    };
  }

  /**
   * 7. 보강 수업(Makeup) 대상 지정 및 완료 상태 토글
   */
  async updateMakeup(
    academyId: number,
    attendanceId: number,
    dto: UpdateMakeupDto,
  ): Promise<AttendanceResponseDto> {
    const existing = await this.prisma.attendance.findFirst({
      where: { id: BigInt(attendanceId), academyId },
    });

    if (!existing) {
      throw new NotFoundException('해당 출결 기록을 찾을 수 없습니다.');
    }

    const updated = await this.prisma.attendance.update({
      where: { id: BigInt(attendanceId) },
      data: {
        isMakeupNeeded: dto.isMakeupNeeded,
        isMakeupCompleted: dto.isMakeupCompleted ?? existing.isMakeupCompleted,
        memo: dto.memo !== undefined ? dto.memo : existing.memo,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
            studentPhone: true,
            parentPhone: true,
            parentName: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            schedule: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * 8. 출결 기록 삭제
   */
  async deleteAttendance(
    academyId: number,
    attendanceId: number,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.attendance.findFirst({
      where: { id: BigInt(attendanceId), academyId },
    });

    if (!existing) {
      throw new NotFoundException('해당 출결 기록을 찾을 수 없습니다.');
    }

    await this.prisma.attendance.delete({
      where: { id: BigInt(attendanceId) },
    });

    return {
      success: true,
      message: '출결 기록이 성공적으로 삭제되었습니다.',
    };
  }

  /**
   * 9. 오늘 미등원 수강생 감지 및 경고 상태 조회 (출결 버튼 신호 연동)
   */
  async getUnattendedStatus(
    academyId: number,
    targetDateStr?: string,
  ): Promise<UnattendedStatusResponseDto> {
    const todayStr = targetDateStr || new Date().toISOString().slice(0, 10);
    const parsedDate = this.parseDateOnly(todayStr);

    const now = new Date();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const currentDayName = dayNames[now.getDay()];

    // 1) 학원의 활성 수업 반 목록 조회
    const activeClasses = await this.prisma.class.findMany({
      where: { academyId, status: ClassStatus.ACTIVE },
      include: {
        enrollments: {
          where: {
            status: EnrollmentStatus.ENROLLED,
            startDate: { lte: parsedDate },
            OR: [{ endDate: null }, { endDate: { gte: parsedDate } }],
          },
          include: {
            student: true,
          },
        },
        attendances: {
          where: { date: parsedDate },
        },
      },
    });

    // 2) 오늘 발송된 미등원 알림 조회
    const todayAlerts = await this.prisma.notification.findMany({
      where: {
        academyId,
        type: NotificationType.UNATTENDED_ALERT,
        createdAt: {
          gte: parsedDate,
        },
      },
    });

    const alertMap = new Map<string, Date>();
    todayAlerts.forEach((al) => {
      if (al.studentId && al.classId) {
        alertMap.set(`${al.studentId}_${al.classId}`, al.createdAt);
      }
    });

    const unattendedStudents: UnattendedStudentDto[] = [];

    for (const cls of activeClasses) {
      // 요일 체크: schedule에 오늘 요일이 포함되어 있거나 지정되지 않은 경우
      const isTodayClass =
        !cls.schedule ||
        cls.schedule.includes(currentDayName) ||
        cls.schedule.includes('매일');

      if (!isTodayClass) continue;

      const attendanceMap = new Map<number, any>();
      cls.attendances.forEach((att) => {
        attendanceMap.set(att.studentId, att);
      });

      for (const enr of cls.enrollments) {
        const att = attendanceMap.get(enr.studentId);
        // 출결 기록이 없거나 아직 체크되지 않은 학생
        if (!att) {
          const key = `${enr.studentId}_${cls.id}`;
          const alertSentAt = alertMap.get(key) || null;

          unattendedStudents.push({
            studentId: enr.student.id,
            studentName: enr.student.name,
            grade: enr.student.grade,
            parentPhone: enr.student.parentPhone,
            studentPhone: enr.student.studentPhone,
            classId: cls.id,
            className: cls.name,
            schedule: cls.schedule,
            isAlertSent: !!alertSentAt,
            alertSentAt,
          });
        }
      }
    }

    return {
      isUnattendedAlertActive: unattendedStudents.length > 0,
      unattendedCount: unattendedStudents.length,
      unattendedStudents,
    };
  }

  /**
   * 10. 미등원 학생 대상 카카오 안심 알림톡 일괄 자동 발송
   */
  async triggerUnattendedAlerts(
    academyId: number,
    targetDateStr?: string,
  ): Promise<{ sentCount: number; message: string; results: any[] }> {
    const status = await this.getUnattendedStatus(academyId, targetDateStr);
    const unsentList = status.unattendedStudents.filter(
      (st) => !st.isAlertSent,
    );

    const sentResults = [];
    for (const st of unsentList) {
      const scheduleTime = st.schedule
        ? st.schedule.split(' ')[1] || st.schedule
        : '수업 시간';
      const title = `[미등원 알림] ${st.studentName} 학생`;
      const message = `[ClassHelper 안심 알림] ${st.studentName} 학생이 [${st.className}] 수업 시간(${scheduleTime})까지 아직 출석하지 않아 안내드립니다.`;

      const notification = await this.notificationsService.createNotification(
        academyId,
        {
          studentId: st.studentId,
          classId: st.classId,
          type: NotificationType.UNATTENDED_ALERT,
          channel: NotificationChannel.KAKAO,
          title,
          message,
          targetPhone: st.parentPhone,
          metadata: {
            studentName: st.studentName,
            className: st.className,
            schedule: st.schedule,
            isAutoTriggered: true,
          },
        },
      );

      sentResults.push(notification);
    }

    return {
      sentCount: sentResults.length,
      message:
        sentResults.length > 0
          ? `${sentResults.length}명의 미등원 학생 학부모님께 카카오 안심 알림톡이 성공적으로 발송되었습니다.`
          : '이미 모든 미등원 학생에게 알림이 발송되었거나 미등원 학생이 없습니다.',
      results: sentResults,
    };
  }

  // ==========================================
  // 키오스크 (비인증) 출석 체크
  // ==========================================

  /**
   * 학원 로비 키오스크에서 학생이 전화번호 뒷자리를 입력하면 일치하는 학생과
   * 오늘 체크인 가능한 수업 목록을 반환한다. JWT 없이 kioskToken으로만 학원을 식별한다.
   */
  async kioskLookup(dto: KioskLookupDto): Promise<KioskLookupResponseDto> {
    const academyId = await this.resolveAcademyByKioskToken(dto.kioskToken);

    const students = await this.prisma.student.findMany({
      where: { academyId, status: 'ACTIVE' },
      select: { id: true, name: true, studentPhone: true, parentPhone: true },
    });

    const matchedStudents = students.filter((s) => {
      const primaryPhone = s.studentPhone || s.parentPhone;
      return this.normalizePhoneLast4(primaryPhone) === dto.phoneLast4;
    });

    if (matchedStudents.length === 0) {
      throw new NotFoundException(
        '일치하는 학생을 찾을 수 없습니다. 번호를 다시 확인해주세요.',
      );
    }

    const now = new Date();
    const matches: KioskStudentMatchDto[] = [];
    for (const student of matchedStudents) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          academyId,
          studentId: student.id,
          status: EnrollmentStatus.ENROLLED,
          class: { status: ClassStatus.ACTIVE },
        },
        include: {
          class: { select: { id: true, name: true, schedule: true } },
        },
      });

      const enrolledClasses = enrollments.map((e) => e.class);
      const todayClasses = enrolledClasses.filter((c) =>
        this.isScheduledToday(c.schedule, now),
      );
      const classOptions = (
        todayClasses.length > 0 ? todayClasses : enrolledClasses
      ).map((c) => ({ id: c.id, name: c.name }));

      matches.push({
        studentId: student.id,
        studentName: student.name,
        classes: classOptions,
      });
    }

    return { matches };
  }

  /**
   * kioskLookup에서 확인한 학생/수업으로 실제 출결을 기록한다.
   * studentId는 추측 가능한 순차 ID이므로, kioskToken만으로 studentId를 그대로
   * 신뢰하지 않고 phoneLast4가 그 학생의 번호와 실제로 일치하는지 다시 검증한다
   * (그렇지 않으면 kioskToken만 알아내면 전화번호 확인 없이 임의 학생의 출석을
   * 조작할 수 있게 된다).
   * 내부적으로 기존 quickCheck(교사용 원터치 체크)와 동일한 upsert 로직을 재사용한다.
   */
  async kioskCheckIn(dto: KioskCheckInDto): Promise<AttendanceResponseDto> {
    const academyId = await this.resolveAcademyByKioskToken(dto.kioskToken);

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, academyId, status: 'ACTIVE' },
      select: { studentPhone: true, parentPhone: true },
    });
    const primaryPhone = student?.studentPhone || student?.parentPhone;
    if (!student || this.normalizePhoneLast4(primaryPhone) !== dto.phoneLast4) {
      throw new NotFoundException('전화번호와 학생 정보가 일치하지 않습니다.');
    }

    return this.quickCheck(academyId, {
      studentId: dto.studentId,
      classId: dto.classId,
      type: dto.type,
    });
  }

  /**
   * 키오스크 접속 토큰을 새로 발급(또는 재발급)한다. 재발급 시 기존 토큰은 즉시 무효화된다.
   */
  async generateKioskToken(academyId: number): Promise<KioskTokenResponseDto> {
    const kioskToken = randomBytes(24).toString('hex');
    await this.prisma.academy.update({
      where: { id: academyId },
      data: { kioskToken },
    });
    return { kioskToken };
  }

  private async resolveAcademyByKioskToken(
    kioskToken: string,
  ): Promise<number> {
    const academy = await this.prisma.academy.findUnique({
      where: { kioskToken },
      select: { id: true, status: true },
    });
    if (!academy || academy.status !== 'ACTIVE') {
      throw new NotFoundException('유효하지 않은 키오스크 접속 정보입니다.');
    }
    return academy.id;
  }

  private normalizePhoneLast4(phone: string | null | undefined): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 4 ? digits.slice(-4) : null;
  }

  private isScheduledToday(
    schedule: string | null | undefined,
    now: Date,
  ): boolean {
    if (!schedule) return false;
    const DAY_CHARS = ['일', '월', '화', '수', '목', '금', '토'];
    return schedule.includes(DAY_CHARS[now.getDay()]);
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  private async validateStudentAndClass(
    academyId: number,
    studentId: number,
    classId: number,
  ): Promise<void> {
    const [student, classInfo] = await Promise.all([
      this.prisma.student.findFirst({ where: { id: studentId, academyId } }),
      this.prisma.class.findFirst({ where: { id: classId, academyId } }),
    ]);

    if (!student) {
      throw new NotFoundException('해당 학원의 수강생을 찾을 수 없습니다.');
    }
    if (!classInfo) {
      throw new NotFoundException('해당 학원의 수업 반을 찾을 수 없습니다.');
    }
  }

  private parseDateOnly(dateStr: string): Date {
    const formatted = dateStr.slice(0, 10);
    return new Date(`${formatted}T00:00:00.000Z`);
  }

  private mapToResponseDto(att: any): AttendanceResponseDto {
    return {
      id: Number(att.id),
      academyId: att.academyId,
      studentId: att.studentId,
      classId: att.classId,
      date:
        att.date instanceof Date
          ? att.date.toISOString().slice(0, 10)
          : String(att.date),
      status: att.status,
      checkInTime: att.checkInTime ? att.checkInTime.toISOString() : null,
      checkOutTime: att.checkOutTime ? att.checkOutTime.toISOString() : null,
      reason: att.reason,
      isMakeupNeeded: att.isMakeupNeeded,
      isMakeupCompleted: att.isMakeupCompleted,
      memo: att.memo,
      createdAt: att.createdAt,
      updatedAt: att.updatedAt,
      student: att.student,
      class: att.class,
    };
  }
}
