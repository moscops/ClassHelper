import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { StudentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import {
  StudentResponseDto,
  StudentDetailResponseDto,
  PaginatedStudentResponseDto,
} from './dto/student-response.dto';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 원생 신규 등록
   */
  async create(
    academyId: number,
    dto: CreateStudentDto,
  ): Promise<StudentResponseDto> {
    const student = await this.prisma.student.create({
      data: {
        academyId,
        name: dto.name,
        gender: dto.gender,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        schoolName: dto.schoolName,
        grade: dto.grade,
        studentPhone: dto.studentPhone,
        parentPhone: dto.parentPhone,
        parentName: dto.parentName,
        parentRelationship: dto.parentRelationship,
        status: dto.status ?? StudentStatus.ACTIVE,
        enrolledAt: dto.enrolledAt ? new Date(dto.enrolledAt) : new Date(),
        memo: dto.memo,
      },
    });

    this.logger.log(
      `원생 등록 완료: [${student.name}(ID: ${student.id})] - 학원: ${academyId}`,
    );
    return student;
  }

  /**
   * 원생 목록 검색 및 페이징 조회
   */
  async findAll(
    academyId: number,
    query: QueryStudentDto,
  ): Promise<PaginatedStudentResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {
      academyId,
      ...(query.status && { status: query.status }),
      ...(query.grade && { grade: query.grade }),
      ...(query.classId && {
        enrollments: {
          some: {
            classId: query.classId,
            status: 'ENROLLED',
          },
        },
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { studentPhone: { contains: query.search } },
          { parentPhone: { contains: query.search } },
          { schoolName: { contains: query.search, mode: 'insensitive' } },
          { parentName: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, studentsWithEnrollments] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        include: {
          enrollments: {
            where: { status: 'ENROLLED' },
            include: {
              class: {
                select: {
                  id: true,
                  name: true,
                  subject: true,
                },
              },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const items = studentsWithEnrollments.map((s) => {
      const { enrollments, ...rest } = s;
      return {
        ...rest,
        enrolledClasses: (enrollments || []).map((e) => ({
          id: e.class.id,
          name: e.class.name,
          subject: e.class.subject,
        })),
      };
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 원생 상세 조회 (수강 중인 반 목록 포함)
   */
  async findOne(
    academyId: number,
    id: number,
  ): Promise<StudentDetailResponseDto> {
    const student = await this.prisma.student.findFirst({
      where: { id, academyId },
      include: {
        enrollments: {
          include: {
            class: {
              include: {
                teacher: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`ID가 ${id}인 원생을 찾을 수 없습니다.`);
    }

    const { enrollments, ...studentInfo } = student;

    const classes = enrollments.map((enr) => ({
      enrollmentId: enr.id,
      classId: enr.class.id,
      className: enr.class.name,
      subject: enr.class.subject,
      teacherName: enr.class.teacher?.name ?? null,
      status: enr.status,
      startDate: enr.startDate,
    }));

    return {
      ...studentInfo,
      classes,
    };
  }

  /**
   * 원생 정보 수정
   */
  async update(
    academyId: number,
    id: number,
    dto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    await this.ensureStudentExists(academyId, id);

    const student = await this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.birthDate !== undefined && {
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        }),
        ...(dto.schoolName !== undefined && { schoolName: dto.schoolName }),
        ...(dto.grade !== undefined && { grade: dto.grade }),
        ...(dto.studentPhone !== undefined && {
          studentPhone: dto.studentPhone,
        }),
        ...(dto.parentPhone !== undefined && { parentPhone: dto.parentPhone }),
        ...(dto.parentName !== undefined && { parentName: dto.parentName }),
        ...(dto.parentRelationship !== undefined && {
          parentRelationship: dto.parentRelationship,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.enrolledAt !== undefined && {
          enrolledAt: dto.enrolledAt ? new Date(dto.enrolledAt) : null,
        }),
        ...(dto.dischargedAt !== undefined && {
          dischargedAt: dto.dischargedAt ? new Date(dto.dischargedAt) : null,
        }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
    });

    this.logger.log(`원생 정보 수정: [${student.name}(ID: ${student.id})]`);
    return student;
  }

  /**
   * 원생 재원 상태 변경 (재원 / 휴원 / 퇴원)
   */
  async updateStatus(
    academyId: number,
    id: number,
    dto: UpdateStudentStatusDto,
  ): Promise<StudentResponseDto> {
    const existing = await this.ensureStudentExists(academyId, id);

    let dischargedAt: Date | null = existing.dischargedAt;
    if (dto.status === StudentStatus.DISCHARGED) {
      dischargedAt = dto.dischargedAt ? new Date(dto.dischargedAt) : new Date();
    } else if (dto.status === StudentStatus.ACTIVE) {
      dischargedAt = null;
    }

    const memo = dto.memo !== undefined ? dto.memo : existing.memo;

    const student = await this.prisma.student.update({
      where: { id },
      data: {
        status: dto.status,
        dischargedAt,
        memo,
      },
    });

    this.logger.log(
      `원생 상태 변경: [${student.name}] 상태: ${existing.status} -> ${dto.status}`,
    );
    return student;
  }

  /**
   * 원생 삭제
   */
  async remove(
    academyId: number,
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    await this.ensureStudentExists(academyId, id);

    await this.prisma.student.delete({
      where: { id },
    });

    this.logger.log(`원생 삭제 완료: [ID: ${id}] - 학원: ${academyId}`);
    return {
      success: true,
      message: '원생 정보가 성공적으로 삭제되었습니다.',
    };
  }

  /**
   * 학생 존재 여부 및 테넌트(academyId) 일치 검증
   */
  private async ensureStudentExists(academyId: number, id: number) {
    const student = await this.prisma.student.findFirst({
      where: { id, academyId },
    });

    if (!student) {
      throw new NotFoundException(`ID가 ${id}인 원생을 찾을 수 없습니다.`);
    }

    return student;
  }
}
