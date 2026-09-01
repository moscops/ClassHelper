import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassLogDto } from './dto/create-class-log.dto';
import { UpdateClassLogDto } from './dto/update-class-log.dto';
import { QueryClassLogsDto } from './dto/query-class-logs.dto';
import { BatchUpdateHomeworkSubmissionsDto } from './dto/update-homework-submission.dto';
import {
  ClassLogResponseDto,
  PaginatedClassLogsResponseDto,
  StudentHomeworkHistoryResponseDto,
} from './dto/class-log-response.dto';
import { HomeworkStatus, Prisma } from '@prisma/client';

@Injectable()
export class ClassLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. 수업 일지 신규 작성
   */
  async create(
    academyId: number,
    teacherId: number,
    dto: CreateClassLogDto,
  ): Promise<ClassLogResponseDto> {
    // 1) 반 존재 및 테넌시 검증
    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.classId, academyId },
      include: {
        enrollments: {
          where: { status: 'ENROLLED' },
          include: { student: true },
        },
      },
    });

    if (!classEntity) {
      throw new NotFoundException('해당 수업 반을 찾을 수 없습니다.');
    }

    const logDate = new Date(dto.date);

    return this.prisma.$transaction(async (tx) => {
      // 2) ClassLog 생성
      const classLog = await tx.classLog.create({
        data: {
          academyId,
          classId: dto.classId,
          teacherId,
          date: logDate,
          curriculum: dto.curriculum,
          lessonContent: dto.lessonContent,
          homework: dto.homework,
          notes: dto.notes,
        },
      });

      // 3) 원생별 HomeworkSubmission 생성
      // dto.submissions 가 명시적으로 제공되었으면 해당 내용 사용, 없으면 활성 수강생 전원 NOT_SUBMITTED 로 생성
      const enrolledStudentIds = classEntity.enrollments.map(
        (e) => e.studentId,
      );
      const submissionMap = new Map<
        number,
        { status: HomeworkStatus; score?: number; feedback?: string }
      >();

      if (dto.submissions && dto.submissions.length > 0) {
        for (const sub of dto.submissions) {
          submissionMap.set(sub.studentId, {
            status: sub.status || HomeworkStatus.NOT_SUBMITTED,
            score: sub.score,
            feedback: sub.feedback,
          });
        }
      }

      // 수강생 전원에 대해 생성
      const submissionsToCreate: Prisma.HomeworkSubmissionCreateManyInput[] =
        enrolledStudentIds.map((studentId) => {
          const customSub = submissionMap.get(studentId);
          return {
            classLogId: classLog.id,
            studentId,
            status: customSub ? customSub.status : HomeworkStatus.NOT_SUBMITTED,
            score: customSub ? customSub.score : null,
            feedback: customSub ? customSub.feedback : null,
          };
        });

      if (submissionsToCreate.length > 0) {
        await tx.homeworkSubmission.createMany({
          data: submissionsToCreate,
        });
      }

      // 4) 생성된 ClassLog 및 Submissions 조회
      const created = await tx.classLog.findUniqueOrThrow({
        where: { id: classLog.id },
        include: {
          class: true,
          teacher: {
            select: { id: true, name: true, email: true },
          },
          homeworkSubmissions: {
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
          },
        },
      });

      return this.mapToResponseDto(created);
    });
  }

  /**
   * 2. 수업 일지 목록 조회 (필터 및 페이징)
   */
  async findAll(
    academyId: number,
    query: QueryClassLogsDto,
  ): Promise<PaginatedClassLogsResponseDto> {
    const {
      classId,
      teacherId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ClassLogWhereInput = {
      academyId,
    };

    if (classId) {
      where.classId = classId;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (search && search.trim()) {
      where.OR = [
        { curriculum: { contains: search.trim(), mode: 'insensitive' } },
        { lessonContent: { contains: search.trim(), mode: 'insensitive' } },
        { homework: { contains: search.trim(), mode: 'insensitive' } },
        { class: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.classLog.count({ where }),
      this.prisma.classLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          class: true,
          teacher: {
            select: { id: true, name: true, email: true },
          },
          homeworkSubmissions: {
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
          },
        },
      }),
    ]);

    return {
      items: items.map((item) => this.mapToResponseDto(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 3. 특정 수업 일지 상세 조회
   */
  async findOne(academyId: number, id: number): Promise<ClassLogResponseDto> {
    const classLog = await this.prisma.classLog.findFirst({
      where: { id, academyId },
      include: {
        class: true,
        teacher: {
          select: { id: true, name: true, email: true },
        },
        homeworkSubmissions: {
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
        },
      },
    });

    if (!classLog) {
      throw new NotFoundException('해당 수업 일지를 찾을 수 없습니다.');
    }

    return this.mapToResponseDto(classLog);
  }

  /**
   * 4. 수업 일지 수정
   */
  async update(
    academyId: number,
    id: number,
    dto: UpdateClassLogDto,
  ): Promise<ClassLogResponseDto> {
    const existing = await this.prisma.classLog.findFirst({
      where: { id, academyId },
    });

    if (!existing) {
      throw new NotFoundException('수정할 수업 일지를 찾을 수 없습니다.');
    }

    const updated = await this.prisma.classLog.update({
      where: { id },
      data: {
        curriculum: dto.curriculum,
        lessonContent: dto.lessonContent,
        homework: dto.homework,
        notes: dto.notes,
        date: dto.date ? new Date(dto.date) : undefined,
        classId: dto.classId,
      },
      include: {
        class: true,
        teacher: {
          select: { id: true, name: true, email: true },
        },
        homeworkSubmissions: {
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
        },
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * 5. 수업 일지 삭제
   */
  async remove(academyId: number, id: number): Promise<{ message: string }> {
    const existing = await this.prisma.classLog.findFirst({
      where: { id, academyId },
    });

    if (!existing) {
      throw new NotFoundException('삭제할 수업 일지를 찾을 수 없습니다.');
    }

    await this.prisma.classLog.delete({
      where: { id },
    });

    return { message: '수업 일지가 성공적으로 삭제되었습니다.' };
  }

  /**
   * 6. 학생별 과제 평가 및 피드백 일괄 수정
   */
  async updateHomeworkSubmissions(
    academyId: number,
    classLogId: number,
    dto: BatchUpdateHomeworkSubmissionsDto,
  ): Promise<ClassLogResponseDto> {
    const classLog = await this.prisma.classLog.findFirst({
      where: { id: classLogId, academyId },
    });

    if (!classLog) {
      throw new NotFoundException('해당 수업 일지를 찾을 수 없습니다.');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.submissions) {
        await tx.homeworkSubmission.upsert({
          where: {
            classLogId_studentId: {
              classLogId,
              studentId: item.studentId,
            },
          },
          create: {
            classLogId,
            studentId: item.studentId,
            status: item.status,
            score: item.score,
            feedback: item.feedback,
          },
          update: {
            status: item.status,
            score: item.score,
            feedback: item.feedback,
          },
        });
      }
    });

    return this.findOne(academyId, classLogId);
  }

  /**
   * 7. 특정 학생의 누적 과제 이력 및 성취도 조회 (학부모 상담용 리포트)
   */
  async getStudentHomeworkHistory(
    academyId: number,
    studentId: number,
  ): Promise<StudentHomeworkHistoryResponseDto> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, academyId },
    });

    if (!student) {
      throw new NotFoundException('해당 원생을 찾을 수 없습니다.');
    }

    const submissions = await this.prisma.homeworkSubmission.findMany({
      where: {
        studentId,
        classLog: { academyId },
      },
      include: {
        classLog: {
          include: {
            class: true,
            teacher: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { classLog: { date: 'desc' } },
    });

    const totalAssignments = submissions.length;
    const completedAssignments = submissions.filter(
      (s) => s.status === HomeworkStatus.COMPLETED,
    ).length;
    const completionRate =
      totalAssignments > 0
        ? Number(((completedAssignments / totalAssignments) * 100).toFixed(1))
        : 0;

    const scoredSubmissions = submissions.filter(
      (s) => s.score !== null && s.score !== undefined,
    );
    const averageScore =
      scoredSubmissions.length > 0
        ? Number(
            (
              scoredSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) /
              scoredSubmissions.length
            ).toFixed(1),
          )
        : null;

    return {
      studentId: student.id,
      studentName: student.name,
      totalAssignments,
      completedAssignments,
      completionRate,
      averageScore,
      history: submissions.map((s) => ({
        id: s.id,
        classLogId: s.classLogId,
        date: s.classLog.date.toISOString().split('T')[0],
        className: s.classLog.class.name,
        teacherName: s.classLog.teacher.name,
        curriculum: s.classLog.curriculum,
        homework: s.classLog.homework,
        status: s.status,
        score: s.score,
        feedback: s.feedback,
      })),
    };
  }

  /**
   * 7-1. 원생 리포트용: 특정 원생의 기간별 과제 수행 통계 (리포트 도메인에서 사용)
   */
  async getStudentHomeworkStats(
    academyId: number,
    studentId: number,
    startDate: string,
    endDate: string,
  ): Promise<{
    totalAssignments: number;
    completedAssignments: number;
    completionRate: number;
    averageScore: number | null;
  }> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, academyId },
    });
    if (!student) {
      throw new NotFoundException('해당 원생을 찾을 수 없습니다.');
    }

    const submissions = await this.prisma.homeworkSubmission.findMany({
      where: {
        studentId,
        classLog: {
          academyId,
          date: {
            gte: new Date(`${startDate}T00:00:00.000Z`),
            lte: new Date(`${endDate}T00:00:00.000Z`),
          },
        },
      },
    });

    const totalAssignments = submissions.length;
    const completedAssignments = submissions.filter(
      (s) => s.status === HomeworkStatus.COMPLETED,
    ).length;
    const completionRate =
      totalAssignments > 0
        ? Number(((completedAssignments / totalAssignments) * 100).toFixed(1))
        : 0;

    const scoredSubmissions = submissions.filter(
      (s) => s.score !== null && s.score !== undefined,
    );
    const averageScore =
      scoredSubmissions.length > 0
        ? Number(
            (
              scoredSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) /
              scoredSubmissions.length
            ).toFixed(1),
          )
        : null;

    return {
      totalAssignments,
      completedAssignments,
      completionRate,
      averageScore,
    };
  }

  /**
   * Helper: DTO Mapping and Aggregations
   */
  private mapToResponseDto(classLog: any): ClassLogResponseDto {
    const submissions = classLog.homeworkSubmissions || [];
    const totalStudents = submissions.length;
    const completedCount = submissions.filter(
      (s: any) => s.status === HomeworkStatus.COMPLETED,
    ).length;
    const incompleteCount = submissions.filter(
      (s: any) => s.status === HomeworkStatus.INCOMPLETE,
    ).length;
    const notSubmittedCount = submissions.filter(
      (s: any) => s.status === HomeworkStatus.NOT_SUBMITTED,
    ).length;
    const excusedCount = submissions.filter(
      (s: any) => s.status === HomeworkStatus.EXCUSED,
    ).length;

    const completionRate =
      totalStudents > 0
        ? Number(((completedCount / totalStudents) * 100).toFixed(1))
        : 0;

    const scored = submissions.filter(
      (s: any) => s.score !== null && s.score !== undefined,
    );
    const averageScore =
      scored.length > 0
        ? Number(
            (
              scored.reduce((sum: number, s: any) => sum + (s.score || 0), 0) /
              scored.length
            ).toFixed(1),
          )
        : undefined;

    return {
      id: classLog.id,
      academyId: classLog.academyId,
      classId: classLog.classId,
      teacherId: classLog.teacherId,
      date:
        classLog.date instanceof Date
          ? classLog.date.toISOString().split('T')[0]
          : classLog.date,
      curriculum: classLog.curriculum,
      lessonContent: classLog.lessonContent,
      homework: classLog.homework,
      notes: classLog.notes,
      createdAt: classLog.createdAt,
      updatedAt: classLog.updatedAt,
      class: classLog.class
        ? {
            id: classLog.class.id,
            name: classLog.class.name,
            subject: classLog.class.subject,
            targetGrade: classLog.class.targetGrade,
            schedule: classLog.class.schedule,
          }
        : undefined,
      teacher: classLog.teacher
        ? {
            id: classLog.teacher.id,
            name: classLog.teacher.name,
            email: classLog.teacher.email,
          }
        : undefined,
      homeworkSubmissions: submissions.map((sub: any) => ({
        id: sub.id,
        classLogId: sub.classLogId,
        studentId: sub.studentId,
        status: sub.status,
        score: sub.score,
        feedback: sub.feedback,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        student: sub.student
          ? {
              id: sub.student.id,
              name: sub.student.name,
              grade: sub.student.grade,
              studentPhone: sub.studentPhone,
              parentPhone: sub.student.parentPhone,
              parentName: sub.student.parentName,
            }
          : undefined,
      })),
      totalStudents,
      completedCount,
      incompleteCount,
      notSubmittedCount,
      excusedCount,
      completionRate,
      averageScore,
    };
  }
}
