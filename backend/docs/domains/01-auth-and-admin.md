# 🔐 01. 인증 및 플랫폼 관리자 도메인 (Auth & Admin Domain)

## 📌 도메인 개요

인증 & 관리자 도메인은 **플랫폼 전체의 테넌트(학원) 격리, 다중 권한(RBAC), 이중 토큰 보안(JWT + RTR), 그리고 슈퍼 관리자 감사 로그(`AuditLog`)**를 총괄하는 최상위 핵심 도메인입니다.

---

## 🗄️ 1. 관련 엔티티 (Entities)

### 1) `Academy` (학원 테넌트)
* **역할**: 모든 비즈니스 데이터의 최상위 격리 경계(Partitioning Boundary).
* **필드**:
  * `id`: 고유 식별자 (PK, Auto-increment)
  * `name`: 학원 명칭 (예: "클래스헬퍼 어학원 대치본원")
  * `status`: `AcademyStatus` (`ACTIVE`, `SUSPENDED`, `PENDING`)
  * `businessNumber`: 사업자등록번호 (선택, 현금영수증/세금계산서 연동용)
  * `phoneNumber`: 학원 대표번호 (알림톡 발신번호로 사용)
  * `address`: 학원 소재지 주소
  * `settings`: 학원별 알림 설정 및 커스텀 JSONB 옵션

### 2) `User` (사용자 계정)
* **역할**: 시스템에 로그인하여 학원 업무 또는 플랫폼 관리 작업을 수행하는 주체.
* **필드**:
  * `id`: 고유 식별자
  * `academyId`: 소속 학원 ID (`SUPER_ADMIN`의 경우 `null` 허용)
  * `email`: 로그인 이메일 (Unique)
  * `password`: bcrypt 해시 암호 (8자 이상, 영문/숫자/특수문자)
  * `name`: 사용자 성함 (예: "김원장", "이선생")
  * `role`: `UserRole` (`SUPER_ADMIN`, `OWNER`, `ADMIN`, `TEACHER`, `STAFF`)
  * `hashedRefreshToken`: RTR 보안 토큰 해시

### 3) `AuditLog` (관리자 감사 로그)
* **역할**: 슈퍼 관리자 또는 원장님의 고위험 작업(학원 정지, 권한 변경, 강제 데이터 수정 등)을 영구 기록.
* **필드**:
  * `id`: BigInt 식별자
  * `adminId`: 작업을 수행한 관리자 User ID
  * `action`: 작업 유형 (예: `UPDATE_ACADEMY_STATUS`, `RESET_USER_PASSWORD`)
  * `targetType`: 대상 도메인 (`ACADEMY`, `USER`, `STUDENT`, `INVOICE`)
  * `targetId`: 대상 레코드 ID
  * `details`: 작업 전/후 변경사항 JSONB
  * `ipAddress`: 요청자 접속 IP

### 4) `Subscription` (요금제 구독 — 플랫폼 자체 수익화)
* **역할**: ClassHelper가 각 학원에 부과하는 요금제 등급을 추적. `tuition` 도메인(학원이 자기 원생에게 청구)과는 완전히 별개의, 플랫폼 자체 매출 모델.
* **요금제 등급 (`PlanTier`)**:
  * `FREE`: 무료 (원생 50명, 1개 학원 제한 — 참고용, 아직 강제되지 않음)
  * `PRO`: 유료, 무제한 원생/반, 단일 학원
  * `ENTERPRISE`: 유료, 무제한 + 본원/분원(다중 학원) 지원
* **구독 상태 (`SubscriptionStatus`)**: `ACTIVE`(정상), `CANCELED`(해지)
* **필드**:
  * `academyId`: 학원당 1개(unique) — 이력은 별도 테이블이 아닌 기존 `AuditLog`로 추적
  * `expiresAt`: 만료일 (nullable = 무기한, 관리자가 수동 관리)
  * `notes`: 관리자 메모 (예: "6개월 프로모션 무료 제공")
* **참고**: 신규 가입 학원은 `registerOwner` 트랜잭션 내에서 자동으로 `FREE` 구독이 생성됩니다. 이 기능 도입 이전 가입한 학원은 구독 레코드가 없으며, 애플리케이션 레벨에서 `FREE`/`ACTIVE`로 취급합니다(별도 백필 불필요).
* **미구현**: 실제 결제 연동(토스페이먼츠 등) 및 한도 강제(원생 51번째 생성 차단 등)는 이번 작업 범위 밖이며 후속 작업으로 예정.

---

## 👥 2. 역할별 권한 매트릭스 (Role Permissions Matrix)

| 기능 / API | SUPER_ADMIN | OWNER | ADMIN | TEACHER | STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **전체 학원 목록 & 통계 조회** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **학원 계정 승인 / 일시정지** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **플랫폼 보안 감사 로그 열람** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **학원 기본 정보 & 설정 수정** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **강사/직원 신규 등록 및 권한 부여** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **본인 학원 강사/직원 목록 조회** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **본인 비밀번호 및 프로필 수정** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **학원 요금제 등급 변경** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **본인 학원 요금제 조회 (`/auth/me`)** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔄 3. 보안 프로세스 (Dual-Token & RTR Flow)

```text
[ Client (Browser) ]                  [ NestJS Backend ]                  [ PostgreSQL DB ]
         │                                    │                                    │
         │─── 1. POST /auth/login ───────────>│                                    │
         │    (email, password)               │─── 2. Validate Password (bcrypt) ─>│
         │                                    │<── 3. Return User & Academy Info ──│
         │                                    │                                    │
         │                                    │─── 4. Generate Access/Refresh Token│
         │                                    │─── 5. Store Hashed Refresh Token ─>│
         │<── 6. Return Tokens & Profile ─────│                                    │
         │    (Access: 15m, Refresh: 7d)      │                                    │
```

---

## 📡 4. RESTful API 명세 (API Specifications)

> 구현 위치: `backend/src/auth/` (`auth.controller.ts`), `backend/src/admin/` (`admin.controller.ts`).

### 4.1. 학원 신규 개설 및 원장 회원가입
* **엔드포인트**: `POST /auth/register-owner` (인증 불필요)
* **Request Body (`RegisterOwnerDto`)**:
  ```json
  {
    "academyName": "클래스헬퍼 어학원",
    "businessNumber": "123-45-67890",
    "academyPhone": "02-1234-5678",
    "address": "서울시 강남구 테헤란로 123",
    "email": "owner@classhelper.kr",
    "password": "Password123!",
    "name": "김원장",
    "phone": "010-1234-5678"
  }
  ```
* **Response Body (`AuthResponseDto`)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": { "id": 1, "academyId": 1, "email": "owner@classhelper.kr", "name": "김원장", "role": "OWNER", "createdAt": "2026-08-18T00:00:00.000Z" },
    "academy": { "id": 1, "name": "클래스헬퍼 어학원", "businessNumber": "123-45-67890", "phoneNumber": "02-1234-5678", "address": "서울시 강남구 테헤란로 123" }
  }
  ```
* **동작 특성**: `Academy`와 `User(OWNER)`를 트랜잭션으로 동시 생성합니다. 이메일 중복 시 `409 Conflict`.

### 4.2. 강사/직원 등록
* **엔드포인트**: `POST /auth/register-staff` (`OWNER`, `ADMIN`)
* **Request Body (`RegisterStaffDto`)**:
  ```json
  {
    "email": "teacher1@classhelper.kr",
    "password": "Teacher123!",
    "name": "이강사",
    "phone": "010-9876-5432",
    "role": "TEACHER"
  }
  ```
* **Response Body (`UserProfileDto`)**: 생성된 계정 정보(비밀번호 제외).
* **동작 특성**: 요청자의 `academyId`에 신규 계정을 종속시킵니다. `role`은 `TEACHER`/`ADMIN`/`STAFF`만 지정 가능.

### 4.3. 로그인
* **엔드포인트**: `POST /auth/login` (인증 불필요)
* **Request Body (`LoginDto`)**: `{ "email": "owner@classhelper.kr", "password": "password123!" }`
* **Response Body (`AuthResponseDto`)**: 4.1과 동일한 형태로 Access/Refresh Token과 `user`, `academy` 정보를 반환합니다. 이메일/비밀번호 불일치 시 `401 Unauthorized`.

### 4.4. 토큰 재발급 (RTR)
* **엔드포인트**: `POST /auth/refresh` (인증 불필요, Refresh Token 필요)
* **Request Body (`RefreshTokenDto`)**: `{ "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..." }`
* **Response Body (`TokensResponseDto`)**: `{ "accessToken": "...", "refreshToken": "..." }` — 새 Refresh Token으로 즉시 교체(RTR)됩니다.
* **동작 특성**: 유효하지 않거나 이미 사용/폐기된 Refresh Token은 `403 Forbidden`이며, 해당 사용자의 저장된 토큰 해시를 초기화(강제 로그아웃)합니다.

### 4.5. 로그아웃
* **엔드포인트**: `POST /auth/logout` (인증 필요)
* **Response Body (`LogoutResponseDto`)**: `{ "success": true, "message": "성공적으로 로그아웃되었습니다." }`
* **동작 특성**: DB에 저장된 `hashedRefreshToken`을 삭제하여 해당 Refresh Token을 즉시 무효화합니다.

### 4.6. 내 정보 및 소속 학원 조회
* **엔드포인트**: `GET /auth/me` (인증 필요)
* **Response Body (`UserDetailResponseDto`)**: `UserProfileDto` + `academy: AcademySummaryDto`.

### 4.7. 플랫폼 전체 요약 통계
* **엔드포인트**: `GET /admin/stats` (`SUPER_ADMIN`) — 전체 학원 수, 원생 수, 오늘 출결 현황 등 플랫폼 요약 통계.

### 4.8. 전체 입점 학원 목록 조회
* **엔드포인트**: `GET /admin/academies?search=클래스헬퍼&status=ACTIVE` (`SUPER_ADMIN`)

### 4.9. 특정 학원 상세 조회
* **엔드포인트**: `GET /admin/academies/:id` (`SUPER_ADMIN`)

### 4.10. 학원 운영 상태 변경
* **엔드포인트**: `PATCH /admin/academies/:id/status` (`SUPER_ADMIN`)
* **Request Body (`UpdateAcademyStatusDto`)**:
  ```json
  {
    "status": "SUSPENDED",
    "reason": "이용약관 위반 및 서비스 이용료 미납으로 인한 일시정지"
  }
  ```
* **동작 특성**: 상태 변경 시 `AuditLog`에 처리자(`adminId`), 변경 사유, 요청 IP를 함께 기록합니다.

### 4.10.5. 학원 요금제 등급 변경
* **엔드포인트**: `PATCH /admin/academies/:id/subscription` (`SUPER_ADMIN`)
* **Request Body (`UpdateSubscriptionDto`)**:
  ```json
  {
    "tier": "PRO",
    "status": "ACTIVE",
    "expiresAt": "2026-12-31",
    "notes": "6개월 프로모션 무료 제공",
    "reason": "유료 전환 문의 후 수동 업그레이드"
  }
  ```
  * `tier`만 필수, 나머지는 선택 값입니다.
* **동작 특성**: 구독 레코드가 없는(백필 이전) 학원도 처리할 수 있도록 `update`가 아닌 `upsert`를 사용합니다. 등급 변경 시 `AuditLog`에 `action: "UPDATE_SUBSCRIPTION_TIER"`로 이전/신규 등급과 사유가 함께 기록됩니다.

### 4.11. 플랫폼 관리자 감사 로그 조회
* **엔드포인트**: `GET /admin/audit-logs?limit=30` (`SUPER_ADMIN`)
