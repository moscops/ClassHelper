import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { StudentStatus, Gender, Prisma } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
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
import { BulkImportResultDto } from './dto/bulk-import-result.dto';

const MAX_BULK_IMPORT_ROWS = 2000;

// CSV 헤더 -> Prisma 필드명 매핑 (한글 라벨과 영문 필드명 모두 허용)
const BULK_IMPORT_HEADER_ALIASES: Record<string, string> = {
  이름: 'name',
  name: 'name',
  성별: 'gender',
  gender: 'gender',
  생년월일: 'birthDate',
  birthdate: 'birthDate',
  학교명: 'schoolName',
  학교: 'schoolName',
  schoolname: 'schoolName',
  학년: 'grade',
  grade: 'grade',
  학생연락처: 'studentPhone',
  '학생 연락처': 'studentPhone',
  studentphone: 'studentPhone',
  학부모연락처: 'parentPhone',
  '학부모 연락처': 'parentPhone',
  parentphone: 'parentPhone',
  학부모이름: 'parentName',
  '학부모 이름': 'parentName',
  parentname: 'parentName',
  학부모관계: 'parentRelationship',
  '학부모 관계': 'parentRelationship',
  parentrelationship: 'parentRelationship',
  재원상태: 'status',
  '재원 상태': 'status',
  status: 'status',
  등록일: 'enrolledAt',
  enrolledat: 'enrolledAt',
  메모: 'memo',
  memo: 'memo',
};

function normalizeBulkImportHeader(raw: string): string | null {
  const trimmed = raw.trim();
  return (
    BULK_IMPORT_HEADER_ALIASES[trimmed] ??
    BULK_IMPORT_HEADER_ALIASES[trimmed.toLowerCase()] ??
    null
  );
}

function coerceGender(value: string): Gender | null {
  const v = value.trim();
  if (v === '남' || v === '남자' || v.toUpperCase() === 'MALE')
    return Gender.MALE;
  if (v === '여' || v === '여자' || v.toUpperCase() === 'FEMALE')
    return Gender.FEMALE;
  return null;
}

function coerceStatus(value: string): StudentStatus | null {
  const v = value.trim();
  if (v === '재원' || v.toUpperCase() === 'ACTIVE') return StudentStatus.ACTIVE;
  if (v === '휴원' || v.toUpperCase() === 'ON_LEAVE')
    return StudentStatus.ON_LEAVE;
  if (v === '퇴원' || v.toUpperCase() === 'DISCHARGED')
    return StudentStatus.DISCHARGED;
  return null;
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

function bulkImportDedupeKey(name: string, parentPhone: string): string {
  return `${name.trim()}|${parentPhone.trim()}`;
}

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

  /**
   * 원생 CSV 일괄 등록
   *
   * 부분 성공을 허용한다: 검증에 실패한 행은 건너뛰고(failed) 나머지 유효한 행은 등록한다.
   * 동일 학원 내 (이름, 학부모 연락처)가 이미 존재하거나 파일 내에서 중복되는 행은
   * 생성하지 않고 건너뛴다(skipped) — 같은 파일을 재업로드해도 안전(idempotent)하도록
   * 하기 위한 방어 규칙이며, 기존 데이터를 덮어쓰지 않는다(upsert 아님).
   */
  async bulkImport(
    academyId: number,
    fileBuffer: Buffer,
  ): Promise<BulkImportResultDto> {
    let rawRows: Record<string, string>[];
    try {
      rawRows = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch {
      throw new BadRequestException(
        'CSV 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.',
      );
    }

    if (rawRows.length === 0) {
      throw new BadRequestException('CSV 파일에 데이터가 없습니다.');
    }
    if (rawRows.length > MAX_BULK_IMPORT_ROWS) {
      throw new BadRequestException(
        `한 번에 최대 ${MAX_BULK_IMPORT_ROWS}행까지만 업로드할 수 있습니다. (현재: ${rawRows.length}행)`,
      );
    }

    const existing = await this.prisma.student.findMany({
      where: { academyId },
      select: { name: true, parentPhone: true },
    });
    const existingKeys = new Set(
      existing.map((s) => bulkImportDedupeKey(s.name, s.parentPhone)),
    );
    const seenInFile = new Set<string>();

    const skipped: BulkImportResultDto['skipped'] = [];
    const failed: BulkImportResultDto['failed'] = [];
    const toCreate: Prisma.StudentCreateInput[] = [];

    rawRows.forEach((raw, index) => {
      const rowNum = index + 1;
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(raw)) {
        const canonical = normalizeBulkImportHeader(key);
        if (canonical && value !== undefined && value !== null) {
          mapped[canonical] = String(value).trim();
        }
      }

      const errors: string[] = [];
      const name = mapped.name;
      if (!name) errors.push('이름을 입력해주세요.');
      else if (name.length > 50)
        errors.push('이름은 50자를 초과할 수 없습니다.');

      const parentPhone = mapped.parentPhone;
      if (!parentPhone) errors.push('학부모 연락처를 입력해주세요.');
      else if (parentPhone.length > 20)
        errors.push('학부모 연락처는 20자를 초과할 수 없습니다.');

      let gender: Gender | undefined;
      if (mapped.gender) {
        const coerced = coerceGender(mapped.gender);
        if (!coerced)
          errors.push(
            `성별 값을 인식할 수 없습니다: "${mapped.gender}" (남/여 또는 MALE/FEMALE)`,
          );
        else gender = coerced;
      }

      let status: StudentStatus | undefined;
      if (mapped.status) {
        const coerced = coerceStatus(mapped.status);
        if (!coerced)
          errors.push(
            `재원 상태 값을 인식할 수 없습니다: "${mapped.status}" (재원/휴원/퇴원)`,
          );
        else status = coerced;
      }

      let birthDate: Date | undefined;
      if (mapped.birthDate) {
        if (!isValidDateString(mapped.birthDate))
          errors.push('생년월일 형식이 올바르지 않습니다 (YYYY-MM-DD).');
        else birthDate = new Date(mapped.birthDate);
      }

      let enrolledAt: Date | undefined;
      if (mapped.enrolledAt) {
        if (!isValidDateString(mapped.enrolledAt))
          errors.push('등록일 형식이 올바르지 않습니다 (YYYY-MM-DD).');
        else enrolledAt = new Date(mapped.enrolledAt);
      }

      if (errors.length > 0) {
        failed.push({ row: rowNum, name: name || undefined, errors });
        return;
      }

      const key = bulkImportDedupeKey(name, parentPhone);
      if (existingKeys.has(key) || seenInFile.has(key)) {
        skipped.push({
          row: rowNum,
          name,
          reason: '동일한 이름/학부모 연락처의 원생이 이미 등록되어 있습니다.',
        });
        return;
      }
      seenInFile.add(key);

      toCreate.push({
        academy: { connect: { id: academyId } },
        name,
        gender,
        birthDate,
        schoolName: mapped.schoolName || undefined,
        grade: mapped.grade || undefined,
        studentPhone: mapped.studentPhone || undefined,
        parentPhone,
        parentName: mapped.parentName || undefined,
        parentRelationship: mapped.parentRelationship || undefined,
        status: status ?? StudentStatus.ACTIVE,
        enrolledAt: enrolledAt ?? new Date(),
        memo: mapped.memo || undefined,
      });
    });

    const created =
      toCreate.length > 0
        ? await this.prisma.$transaction(
            toCreate.map((data) => this.prisma.student.create({ data })),
          )
        : [];

    this.logger.log(
      `원생 CSV 일괄 등록: 학원 ${academyId} - 생성 ${created.length} / 건너뜀 ${skipped.length} / 실패 ${failed.length} (총 ${rawRows.length}행)`,
    );

    return {
      totalRows: rawRows.length,
      createdCount: created.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      created,
      skipped,
      failed,
    };
  }

  /**
   * 원생 CSV 일괄 등록용 템플릿 파일 생성 (헤더 + 예시 1행)
   */
  getBulkImportTemplate(): Buffer {
    const header = [
      '이름',
      '성별',
      '생년월일',
      '학교명',
      '학년',
      '학생연락처',
      '학부모연락처',
      '학부모이름',
      '학부모관계',
      '재원상태',
      '등록일',
      '메모',
    ];
    const example = [
      '김민준',
      '남',
      '2013-05-14',
      '대치중학교',
      '중2',
      '010-1111-2222',
      '010-1234-5678',
      '김영희',
      '모',
      '재원',
      '2026-03-02',
      '형제 할인 대상',
    ];
    const csv = stringify([header, example]);
    // Excel(Windows)에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다.
    return Buffer.concat([
      Buffer.from('﻿', 'utf-8'),
      Buffer.from(csv, 'utf-8'),
    ]);
  }
}
