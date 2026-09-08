# 🏛️ 도메인 아키텍처 및 역할별 가이드

ClassHelper는 **멀티테넌시(Multi-Tenancy)** 기반의 B2B SaaS 구조로 설계되었습니다. 각 학원(Academy)은 독립된 테넌트 단위로 격리되며, 모든 도메인 엔티티는 `academyId`를 기준으로 안전하게 분리 관리됩니다.

> 📌 각 도메인의 API 엔드포인트/DTO 상세 스펙은 `docs/domains/*.md`를 참고하세요. 이 문서는 도메인 간 관계와 데이터 모델 개요만 다룹니다.

---

## 🗺️ 전체 도메인 관계 다이어그램 (ERD)

```mermaid
erDiagram
    Academy ||--o{ User : "소속 강사/직원"
    Academy ||--o{ Student : "재원생"
    Academy ||--o{ Class : "개설 반"
    Academy ||--o{ Attendance : "출결 기록"
    Academy ||--o{ TuitionInvoice : "수강료 청구"
    Academy ||--o{ TuitionPayment : "수납 내역"
    Academy ||--o{ ClassLog : "수업 일지"
    Academy ||--o{ Notification : "알림 발송 이력"
    Academy ||--o{ AcademyEvent : "학사 일정"
    Academy ||--o| Subscription : "요금제 구독"

    Class ||--o{ Enrollment : "수강 등록"
    Student ||--o{ Enrollment : "수강 등록"
    User ||--o{ Class : "담당 강사"
    User ||--o{ ClassLog : "작성 강사"
    User ||--o{ AuditLog : "감사 로그 주체"

    Student ||--o{ Attendance : "출석 기록"
    Class ||--o{ Attendance : "수업 출석"

    Student ||--o{ TuitionInvoice : "청구 대상"
    TuitionInvoice ||--o{ TuitionPayment : "수납 매핑"

    ClassLog ||--o{ HomeworkSubmission : "과제 제출"
    Student ||--o{ HomeworkSubmission : "과제 평가"

    Student ||--o{ Notification : "대상 학생 (선택)"
    Class ||--o{ Notification : "대상 반 (선택)"
```

`Notification`의 `studentId`/`classId`/`userId`는 알림 유형에 따라 선택적으로 채워지는 대상 참조이며, 구조적 소유 관계가 아닙니다.

---

## 🧱 핵심 도메인 상세

### 1. 학원(테넌트) & 사용자/인증 (`Academies & Users`)
- **역할**: 멀티테넌시의 최상위 루트 엔티티 및 시스템 접근 사용자 관리.
- **주요 엔티티**:
  - `Academy`: 학원명, 사업자등록번호, 대표 연락처, 주소, 상태(`AcademyStatus`: `ACTIVE`/`SUSPENDED`/`PENDING`), 학원 설정(`settings: Json`), 출석 키오스크 접속 토큰(`kioskToken`, 학원당 1개, 미발급 시 null).
  - `User`: 사용자 이메일(로그인 ID), bcrypt 해시 비밀번호, 성명, 연락처, 권한 역할(`UserRole`), refresh token 해시(`hashedRefreshToken`), 최초 로그인 시 비밀번호 변경 강제 플래그(`mustChangePassword` — 원장/관리자가 대신 계정을 만든 경우 `true`로 시작, `PATCH /auth/change-password` 성공 시 해제).
  - `AuditLog`: SUPER_ADMIN의 플랫폼 관리 작업(학원 상태 변경, 구독 등급 변경 등) 감사 기록. 관리자(`User`)에 종속.
- **권한 체계 (`UserRole`)**:
  | 권한 | 대상 | 권한 범위 |
  | :--- | :--- | :--- |
  | `SUPER_ADMIN` | 플랫폼 운영자 | 전 학원 관제, 구독/상태 관리, 감사 로그 열람 (academyId 없음) |
  | `OWNER` | 원장님 (최고 관리자) | 학원 설정, 강사/직원 추가, 재정/수납, 전체 반/학생 관리 전권 |
  | `ADMIN` | 실장 / 원무 관리자 | 학생/반 등록 및 관리, 수강료 수납 처리, 출결 확인 |
  | `TEACHER` | 담당 강사 | 담당 반 수업 일지 작성, 과제 검사, 담당 반 출결 체크 및 학생 조회 |
  | `STAFF` | 조교 / 안내 데스크 | 단순 출결 체크 보조, 원무 안내 |

---

### 2. 학생 & 반 & 수강 관리 (`Students, Classes & Enrollments`)
- **역할**: 학원의 핵심 자산인 원생과 수업 커리큘럼, 그리고 수강 매핑 관리.
- **주요 엔티티**:
  - `Student`: 원생 이름, 성별, 생년월일, 학교/학년, 원생 연락처, **학부모 연락처**, 재원 상태(`ACTIVE`, `ON_LEAVE`, `DISCHARGED`), 메모.
  - `Class`: 반 명칭, 과목, 담당 강사(`User`), 타겟 학년, 수업 시간표(`schedule`, 자유 텍스트 — 출석 키오스크/캘린더가 요일 매칭에 사용), 정원(`capacity`), 월 기본 수강료(`monthlyFee`), 운영 상태(`ACTIVE`, `INACTIVE`, `CLOSED`).
  - `Enrollment`: 학생과 반의 N:M 매핑 엔티티. 수강 시작일, 종료일, 수강 상태(`ENROLLED`, `COMPLETED`, `DROPPED`, `PAUSED`).
- **부가 기능**: 학생 대량 등록을 위한 CSV 벌크 임포트(`POST /students/bulk-import`, 신규 모듈 없이 `students` 모듈에 포함).

---

### 3. 일별 출결 관리 (`Attendance`)
- **역할**: 교실 안에서 1초 만에 완료하는 실시간 출결 체크, 보강 관리, 그리고 로비 태블릿용 비인증 셀프 체크인 키오스크.
- **주요 엔티티**:
  - `Attendance`: 일자(`date`), 학생(`Student`), 반(`Class`), 출결 상태(`PRESENT`: 출석, `ABSENT`: 결석, `LATE`: 지각, `EARLY_LEAVE`: 조퇴), 등원/하원 시각(`checkInTime`, `checkOutTime`), 사유, 보강 필요 여부(`isMakeupNeeded`), 보강 완료 여부(`isMakeupCompleted`).
- **비즈니스 규칙**:
  - 동일 학생은 동일 반의 동일 날짜에 1건의 출결 기록만 가집니다 (`@@unique([studentId, classId, date])`).
- **출석 키오스크(`AttendanceKioskController`, 비인증)**: 전화번호 뒷자리 4자리로 자가 체크인. `Academy.kioskToken`으로 학원 식별, `studentPhone` 우선 → 없으면 `parentPhone` 뒷자리 대체. 토큰 발급/재발급은 `POST /attendance/kiosk-token`, 조회 전용은 `GET /attendance/kiosk-token`(재발급 없이 현재 값만 확인 — 다른 기기 캐시 무효화 방지용).

---

### 4. 수강료 청구 및 수납 관리 (`Tuition Invoices & Payments`)
- **역할**: 매월 반복되는 원비 청구, 할인 적용, 복합 결제 수단별 수납 이력 추적.
- **주요 엔티티**:
  - `TuitionInvoice`: 청구 연월(`billingYearMonth`: "YYYY-MM"), 원래 금액(`originalAmount`), 할인 금액(`discountAmount`), 최종 청구액(`finalAmount`), 수납 완료액(`paidAmount`), 납부 기한(`dueDate`), 청구 상태(`UNPAID`, `PARTIALLY_PAID`, `PAID`, `VOID`).
  - `TuitionPayment`: 수납 금액(`amount`), 결제 수단(`CARD`, `CASH`, `BANK_TRANSFER`, `EASY_PAY`, `OTHER`), 영수증 번호, 처리자(`processedById`).
- **참고**: 실 결제 게이트웨이 연동은 미착수(로드맵 다음 순번) — 현재는 수납 "기록"만 처리.

---

### 5. 수업 일지 & 진도/과제 관리 (`ClassLogs & Homework`)
- **역할**: 강의 진도 기록, 학생별 과제 이행도 점검 및 학부모 피드백 리포트 생성 기반.
- **주요 엔티티**:
  - `ClassLog`: 수업 일자, 반(`Class`), 담당 강사(`User`), 진도/교재 범위(`curriculum`), 수업 내용 요약, 과제 안내, 수업 특이사항.
  - `HomeworkSubmission`: 학생별 과제 제출 및 성취도 상태(`COMPLETED`, `INCOMPLETE`, `NOT_SUBMITTED`, `EXCUSED`), 점수(`score`), 개별 피드백(`feedback`).

---

### 6. 알림 (`Notifications`)
- **역할**: 미등원/지각 경고, 등하원 확인, 수강료 안내, 학생 리포트 등 학원 → 학부모/사용자 알림을 채널 불문 단일 모델로 기록.
- **주요 엔티티**:
  - `Notification`: 대상(`userId`/`studentId`/`classId`, 모두 선택), 유형(`NotificationType`: `UNATTENDED_ALERT`, `ATTENDANCE_CHECKIN`, `ATTENDANCE_CHECKOUT`, `TUITION_DUE`, `SYSTEM_NOTICE`, `STUDENT_REPORT`), 채널(`NotificationChannel`: `IN_APP`, `KAKAO`, `SMS`), 상태(`NotificationStatus`: `SENT`, `DELIVERED`, `FAILED`), 제목/본문, 대상 전화번호, 읽음 여부(`isRead`/`readAt`).
- **참고**: 카카오 알림톡은 이 모델에 `channel: KAKAO`로 DB 기록만 남기는 방식 — 실 카카오 API 연동은 아직 없음 (전 채널 공통).

---

### 7. 학원 캘린더 (`Calendar / AcademyEvent`)
- **역할**: 학원 공식 행사/시험/특강/휴원 등 학사 일정 관리(반별 시간표 자체는 `Class.schedule` 자유 텍스트를 프론트에서 파싱해 조합).
- **주요 엔티티**:
  - `AcademyEvent`: 제목, 분류(`EventCategory`: `ACADEMY`, `EXAM`, `SPECIAL`, `HOLIDAY`, `CONSULTATION`, `OTHER`), 표시 색상(`EventColor`), 시작/종료일(`startDate`/`endDate`), 시작/종료 시각(`startTime`/`endTime`, "HH:mm" 자유 텍스트), 설명.
- **권한**: 조회는 전 역할, 생성/수정/삭제는 `SUPER_ADMIN`/`OWNER`/`ADMIN`만 가능.

---

### 8. 학원 요금제 구독 (`Subscription`, 플랫폼 자체 수익화)
- **역할**: ClassHelper 플랫폼이 학원(테넌트)에게 판매하는 요금제 관리. 도메인 내부 기능이 아니라 SaaS 자체의 과금 계층.
- **주요 엔티티**:
  - `Subscription`: 학원당 1개(`academyId @unique`), 등급(`PlanTier`: `FREE`/`PRO`/`ENTERPRISE`), 상태(`SubscriptionStatus`: `ACTIVE`/`CANCELED`), 시작/만료일, 관리자 메모.
- **참고**: 신규 학원 가입 시 자동으로 `FREE`/`ACTIVE` 구독이 생성됩니다(회원가입 트랜잭션 내부). 등급별 사용량 제한(`PLAN_LIMITS`)은 상수만 정의돼 있고 아직 실제로 강제(enforcement)되지 않습니다. 관리는 `admin` 모듈의 `PATCH /admin/academies/:id/subscription`을 통해 이루어집니다.

---

### 부가: 리포트 오케스트레이터 (`Reports`, 별도 Prisma 모델 없음)
`reports` 모듈은 자체 엔티티 없이 기존 도메인 로직을 조합만 하는 오케스트레이터입니다. `AttendanceService`/`ClassLogsService`의 기간별 통계 메서드를 재사용해 학생별/반별 출결·과제 리포트를 생성하고, `NotificationsService`(채널 `KAKAO`)로 발송을 기록합니다. 반 단위 발송은 partial-success(한 학생 실패가 전체를 막지 않음)로 동작합니다.

---

## 🔒 멀티테넌시 데이터 격리 원칙

모든 비즈니스 로직 작성 시 아래 원칙을 반드시 준수해야 합니다:

1. **`academyId` 자동 주입**:
   컨트롤러에서 `@CurrentUser('academyId')`를 통해 현재 로그인된 사용자의 소속 학원 ID를 받아 서비스에 전달합니다.
2. **조회/수정/삭제 쿼리 검증**:
   모든 Prisma 쿼리 조건(`where`)에 항상 `academyId`를 포함하여 다른 학원의 데이터에 접근하지 못하도록 원천 차단합니다.
   ```typescript
   // 안전한 쿼리 예시
   const student = await this.prisma.student.findFirst({
     where: {
       id: studentId,
       academyId: currentUser.academyId, // 테넌트 격리 필수
     },
   });
   ```
3. **예외**: `SUPER_ADMIN`은 `academyId`가 없는 플랫폼 전역 관리자이며, `admin` 모듈을 통해 학원 간 경계를 넘나드는 조회/관리가 허용됩니다(테넌트 격리 원칙의 유일한 의도적 예외).
4. **비인증 경로**: 출석 키오스크(`AttendanceKioskController`)는 JWT 없이 동작하지만, `Academy.kioskToken`(학원별 고유 비밀 토큰)으로 테넌트를 식별하므로 격리가 깨지지 않습니다.
