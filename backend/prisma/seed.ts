import 'dotenv/config';
import { PrismaClient, UserRole, AcademyStatus, StudentStatus, Gender, ClassStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://classhelper_user:classhelper_password@localhost:5432/classhelper_db?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  const defaultPassword = await bcrypt.hash('password123!', 10);

  // 1. 플랫폼 관리자 계정 생성 (SUPER_ADMIN)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@classhelper.kr' },
    update: {
      role: UserRole.SUPER_ADMIN,
      name: '플랫폼 관리자',
      password: defaultPassword,
    },
    create: {
      email: 'admin@classhelper.kr',
      password: defaultPassword,
      name: '플랫폼 관리자',
      phone: '010-0000-0000',
      role: UserRole.SUPER_ADMIN,
      academyId: null,
    },
  });
  console.log(`✅ 플랫폼 관리자 생성 완료: ${adminUser.name} (${adminUser.email})`);

  // 2. 데모 학원 1: 클래스헬퍼 어학원 대치본원
  const academy1 = await prisma.academy.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: '클래스헬퍼 어학원 대치본원',
      status: AcademyStatus.ACTIVE,
      businessNumber: '123-45-67890',
      phoneNumber: '02-1234-5678',
      address: '서울시 강남구 테헤란로 123 4층',
    },
  });

  // 2-1. 원장님 계정 (클래스헬퍼 어학원)
  const owner1 = await prisma.user.upsert({
    where: { email: 'owner@classhelper.kr' },
    update: {
      academyId: academy1.id,
      role: UserRole.OWNER,
      password: defaultPassword,
    },
    create: {
      email: 'owner@classhelper.kr',
      password: defaultPassword,
      name: '김원장',
      phone: '010-1111-2222',
      role: UserRole.OWNER,
      academyId: academy1.id,
    },
  });

  // 3. 데모 학원 2: 에듀스타 수학전문학원 목동본원
  const academy2 = await prisma.academy.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: '에듀스타 수학전문학원 목동본원',
      status: AcademyStatus.ACTIVE,
      businessNumber: '987-65-43210',
      phoneNumber: '02-9876-5432',
      address: '서울시 양천구 목동서로 456 3층',
    },
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'owner2@edustar.kr' },
    update: {
      academyId: academy2.id,
      role: UserRole.OWNER,
      password: defaultPassword,
    },
    create: {
      email: 'owner2@edustar.kr',
      password: defaultPassword,
      name: '이원장',
      phone: '010-3333-4444',
      role: UserRole.OWNER,
      academyId: academy2.id,
    },
  });

  // 4. 데모 반 생성 (Academy 1)
  const class1 = await prisma.class.upsert({
    where: { id: 1 },
    update: {},
    create: {
      academyId: academy1.id,
      name: '중등 수학 심화A반',
      subject: '수학',
      targetGrade: '중2',
      schedule: '월/수/금 17:00-19:00',
      capacity: 15,
      monthlyFee: 350000,
      status: ClassStatus.ACTIVE,
    },
  });

  const class2 = await prisma.class.upsert({
    where: { id: 2 },
    update: {},
    create: {
      academyId: academy1.id,
      name: '고등 영어 독해 주말반',
      subject: '영어',
      targetGrade: '고1',
      schedule: '토/일 14:00-17:00',
      capacity: 12,
      monthlyFee: 420000,
      status: ClassStatus.ACTIVE,
    },
  });

  // 5. 데모 학생 생성
  const studentNames = ['김민준', '이서연', '박도현', '정예은', '최지후', '한하은', '강동원', '윤서아'];
  for (let i = 0; i < studentNames.length; i++) {
    await prisma.student.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        academyId: academy1.id,
        name: studentNames[i],
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        schoolName: '대치중학교',
        grade: '중2',
        studentPhone: `010-1000-000${i + 1}`,
        parentPhone: `010-2000-000${i + 1}`,
        parentName: `학부모${i + 1}`,
        status: StudentStatus.ACTIVE,
      },
    });
  }

  // 6. 감사 로그 샘플 생성
  await prisma.auditLog.createMany({
    data: [
      {
        adminId: adminUser.id,
        action: 'SYSTEM_INITIALIZATION',
        targetType: 'SYSTEM',
        targetId: '0',
        details: { message: '플랫폼 초기화 및 관리자 환경 구성' },
        ipAddress: '127.0.0.1',
      },
      {
        adminId: adminUser.id,
        action: 'ACADEMY_APPROVAL',
        targetType: 'ACADEMY',
        targetId: String(academy1.id),
        details: { academyName: academy1.name, status: 'ACTIVE' },
        ipAddress: '127.0.0.1',
      },
    ],
    skipDuplicates: true,
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
