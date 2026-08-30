import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { QueryClassDto } from './dto/query-class.dto';
import {
  ClassResponseDto,
  PaginatedClassResponseDto,
} from './dto/class-response.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { ClassStatus, EnrollmentStatus, StudentStatus } from '@prisma/client';

@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. 신규 수업 반 개설
   */
  async createClass(
    academyId: number,
    dto: CreateClassDto,
  ): Promise<ClassResponseDto> {
    // 강사 배정 시 해당 학원 소속인지 검증
    if (dto.teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: { id: dto.teacherId, academyId },
      });
      if (!teacher) {
        throw new BadRequestException(
          '해당 학원에 등록된 강사를 찾을 수 없습니다.',
        );
      }
    }

    const newClass = await this.prisma.class.create({
      data: {
        academyId,
        name: dto.name,
        subject: dto.subject,
        targetGrade: dto.targetGrade,
        teacherId: dto.teacherId,
        schedule: dto.schedule,
        capacity: dto.capacity,
        monthlyFee: dto.monthlyFee ?? 0,
        status: dto.status ?? ClassStatus.ACTIVE,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: EnrollmentStatus.ENROLLED },
            },
          },
        },
      },
    });

    this.logger.log(
      `새로운 반 개설 완료: [${newClass.name}] (학원 ID: ${academyId})`,
    );
    return this.mapToClassResponse(newClass);
  }

  /**
   * 2. 반 목록 검색 및 페이징 조회
   */
  async findAllClasses(
    academyId: number,
    query: QueryClassDto,
  ): Promise<PaginatedClassResponseDto> {
    const {
      search,
      status,
      teacherId,
      targetGrade,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      academyId,
    };

    if (status) {
      whereCondition.status = status;
    }

    if (teacherId) {
      whereCondition.teacherId = teacherId;
    }

    if (targetGrade) {
      whereCondition.targetGrade = targetGrade;
    }

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { targetGrade: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, classes] = await Promise.all([
      this.prisma.class.count({ where: whereCondition }),
      this.prisma.class.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          _count: {
            select: {
              enrollments: {
                where: { status: EnrollmentStatus.ENROLLED },
              },
            },
          },
        },
      }),
    ]);

    return {
      items: classes.map((c) => this.mapToClassResponse(c)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 3. 반 상세 정보 및 수강생 목록 조회
   */
  async findClassById(
    academyId: number,
    classId: number,
  ): Promise<ClassResponseDto & { enrollments: EnrollmentResponseDto[] }> {
    const foundClass = await this.prisma.class.findFirst({
      where: { id: classId, academyId },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: EnrollmentStatus.ENROLLED },
            },
          },
        },
        enrollments: {
          include: {
            student: true,
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!foundClass) {
      throw new NotFoundException(
        `ID가 ${classId}인 수업 반을 찾을 수 없습니다.`,
      );
    }

    return {
      ...this.mapToClassResponse(foundClass),
      enrollments: foundClass.enrollments.map((e) =>
        this.mapToEnrollmentResponse(e),
      ),
    };
  }

  /**
   * 4. 반 정보 수정
   */
  async updateClass(
    academyId: number,
    classId: number,
    dto: UpdateClassDto,
  ): Promise<ClassResponseDto> {
    const existingClass = await this.prisma.class.findFirst({
      where: { id: classId, academyId },
    });

    if (!existingClass) {
      throw new NotFoundException(
        `ID가 ${classId}인 수업 반을 찾을 수 없습니다.`,
      );
    }

    if (dto.teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: { id: dto.teacherId, academyId },
      });
      if (!teacher) {
        throw new BadRequestException(
          '해당 학원에 등록된 강사를 찾을 수 없습니다.',
        );
      }
    }

    const updatedClass = await this.prisma.class.update({
      where: { id: classId },
      data: {
        name: dto.name,
        subject: dto.subject,
        targetGrade: dto.targetGrade,
        teacherId: dto.teacherId,
        schedule: dto.schedule,
        capacity: dto.capacity,
        monthlyFee: dto.monthlyFee,
        status: dto.status,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: EnrollmentStatus.ENROLLED },
            },
          },
        },
      },
    });

    return this.mapToClassResponse(updatedClass);
  }

  /**
   * 5. 반 삭제
   */
  async deleteClass(
    academyId: number,
    classId: number,
  ): Promise<{ success: boolean; message: string }> {
    const existingClass = await this.prisma.class.findFirst({
      where: { id: classId, academyId },
    });

    if (!existingClass) {
      throw new NotFoundException(
        `ID가 ${classId}인 수업 반을 찾을 수 없습니다.`,
      );
    }

    await this.prisma.class.delete({
      where: { id: classId },
    });

    this.logger.log(`수업 반 삭제 완료: ID ${classId} (학원 ID: ${academyId})`);
    return { success: true, message: '수업 반이 성공적으로 삭제되었습니다.' };
  }

  // ==========================================
  // 수강생(Enrollment) 관리 기능
  // ==========================================

  /**
   * 6. 특정 반에 학생 수강 등록 (정원 및 중복 검증)
   */
  async enrollStudent(
    academyId: number,
    classId: number,
    dto: CreateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    // 1) 반 확인
    const targetClass = await this.prisma.class.findFirst({
      where: { id: classId, academyId },
      include: {
        _count: {
          select: {
            enrollments: {
              where: { status: EnrollmentStatus.ENROLLED },
            },
          },
        },
      },
    });

    if (!targetClass) {
      throw new NotFoundException('수업 반을 찾을 수 없습니다.');
    }

    if (targetClass.status === ClassStatus.CLOSED) {
      throw new BadRequestException('폐강된 반에는 수강 등록할 수 없습니다.');
    }

    // 2) 정원 체크
    if (
      targetClass.capacity &&
      targetClass._count.enrollments >= targetClass.capacity
    ) {
      throw new BadRequestException(
        `수강 정원(${targetClass.capacity}명)이 초과되어 등록할 수 없습니다.`,
      );
    }

    // 3) 원생 확인
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, academyId },
    });

    if (!student) {
      throw new NotFoundException('원생 정보를 찾을 수 없습니다.');
    }

    if (student.status === StudentStatus.DISCHARGED) {
      throw new BadRequestException(
        '퇴원 처리된 원생은 반에 배정할 수 없습니다.',
      );
    }

    // 4) 현재 수강 중인지 중복 검사
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        academyId,
        classId,
        studentId: dto.studentId,
        status: EnrollmentStatus.ENROLLED,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('이미 해당 반에서 수강 중인 원생입니다.');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    const enrollment = await this.prisma.enrollment.create({
      data: {
        academyId,
        classId,
        studentId: dto.studentId,
        startDate,
        endDate,
        status: dto.status ?? EnrollmentStatus.ENROLLED,
      },
      include: {
        student: true,
      },
    });

    this.logger.log(
      `수강생 등록 완료: [${student.name}] -> [${targetClass.name}] (학원 ID: ${academyId})`,
    );

    return this.mapToEnrollmentResponse(enrollment);
  }

  /**
   * 7. 특정 반의 수강생 목록 조회
   */
  async getEnrolledStudents(
    academyId: number,
    classId: number,
    status?: EnrollmentStatus,
  ): Promise<EnrollmentResponseDto[]> {
    const targetClass = await this.prisma.class.findFirst({
      where: { id: classId, academyId },
    });

    if (!targetClass) {
      throw new NotFoundException('수업 반을 찾을 수 없습니다.');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        academyId,
        classId,
        ...(status ? { status } : {}),
      },
      include: {
        student: true,
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });

    return enrollments.map((e) => this.mapToEnrollmentResponse(e));
  }

  /**
   * 8. 수강 상태 변경 (종강, 중도하차/퇴반, 일시정지)
   */
  async updateEnrollment(
    academyId: number,
    enrollmentId: number,
    dto: UpdateEnrollmentDto,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, academyId },
    });

    if (!enrollment) {
      throw new NotFoundException('수강 등록 정보를 찾을 수 없습니다.');
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: dto.status,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        student: true,
      },
    });

    return this.mapToEnrollmentResponse(updated);
  }

  /**
   * 9. 수강 등록 삭제 (수강 취소)
   */
  async removeEnrollment(
    academyId: number,
    enrollmentId: number,
  ): Promise<{ success: boolean; message: string }> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, academyId },
    });

    if (!enrollment) {
      throw new NotFoundException('수강 등록 정보를 찾을 수 없습니다.');
    }

    await this.prisma.enrollment.delete({
      where: { id: enrollmentId },
    });

    return { success: true, message: '수강 등록이 취소되었습니다.' };
  }

  /**
   * 10. 특정 학생의 수강 반 목록 조회
   */
  async getStudentEnrollments(academyId: number, studentId: number) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, academyId },
    });

    if (!student) {
      throw new NotFoundException('원생 정보를 찾을 수 없습니다.');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { academyId, studentId },
      include: {
        class: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return enrollments.map((e) => ({
      id: e.id,
      startDate: e.startDate,
      endDate: e.endDate,
      status: e.status,
      class: {
        id: e.class.id,
        name: e.class.name,
        subject: e.class.subject,
        targetGrade: e.class.targetGrade,
        schedule: e.class.schedule,
        monthlyFee: Number(e.class.monthlyFee),
        status: e.class.status,
        teacher: e.class.teacher,
      },
    }));
  }

  // ==========================================
  // Helper Mappers
  // ==========================================

  private mapToClassResponse(classData: any): ClassResponseDto {
    return {
      id: classData.id,
      academyId: classData.academyId,
      name: classData.name,
      subject: classData.subject,
      targetGrade: classData.targetGrade,
      teacherId: classData.teacherId,
      teacher: classData.teacher || null,
      schedule: classData.schedule,
      capacity: classData.capacity,
      monthlyFee: Number(classData.monthlyFee),
      status: classData.status,
      enrolledCount: classData._count?.enrollments ?? 0,
      createdAt: classData.createdAt,
      updatedAt: classData.updatedAt,
    };
  }

  private mapToEnrollmentResponse(enrollmentData: any): EnrollmentResponseDto {
    return {
      id: enrollmentData.id,
      academyId: enrollmentData.academyId,
      studentId: enrollmentData.studentId,
      classId: enrollmentData.classId,
      startDate: enrollmentData.startDate,
      endDate: enrollmentData.endDate,
      status: enrollmentData.status,
      student: {
        id: enrollmentData.student.id,
        name: enrollmentData.student.name,
        gender: enrollmentData.student.gender,
        grade: enrollmentData.student.grade,
        schoolName: enrollmentData.student.schoolName,
        studentPhone: enrollmentData.student.studentPhone,
        parentPhone: enrollmentData.student.parentPhone,
        parentName: enrollmentData.student.parentName,
        status: enrollmentData.student.status,
      },
      createdAt: enrollmentData.createdAt,
    };
  }
}
