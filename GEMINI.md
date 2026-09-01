# 🤖 ClassHelper 개발 및 AI 협업 규칙 (GEMINI.md)

> 🔔 **AI 행동 필수 지침**: 
> 1. **인사 규칙**: 세션 시작 시 이 파일(`GEMINI.md`)을 처음 읽거나 로드했을 때에 한하여 응답의 맨 첫머리에 **"ClassHelper 프로젝트에 오신 것을 환영합니다."** 라고 인사하며, 이후 일반적인 대화나 작업 진행 중에는 반복하지 않습니다.
> 2. **환경 변수 파일 접근 절대 금지 (.env)**: 보안 및 민감 정보 보호를 위해 `.env` 및 모든 환경 변수 파일(`.env*`)을 **절대 직접 읽거나, 출력하거나, 참조해서는 안 됩니다.**
> 3. **구조 변경·도메인 수정·스키마 변경 시 `docs/` 및 Notion 동기화**: 프로젝트 아키텍처/구조 변경, 도메인 추가/수정, 비즈니스 로직 및 API 명세, DB 스키마(Prisma) 변경 등 모든 변경 사항이 발생할 때마다 **`docs/` 폴더 내의 해당 마크다운 문서(예: `backend/docs/domains/*.md` 등)와 노션(Notion) 워크스페이스 내 관련 문서(기획서, 요구사항 명세서, Data 모델링/ERD, APISpec, WBS 등)를 반드시 함께 최신화**해야 합니다.
> 4. **Notion(노션) 기획 및 WBS 문서 상시 참조**: 세션 시작 시 `GEMINI.md`를 로드하거나 기능 개발/기획/일정 확인 시, **Notion MCP(`notion_execute` 등)를 통해 노션 워크스페이스 내 기획서, 요구사항 명세서, WBS 일정을 항상 확인 및 참조**하여 개발 내용과 명세를 일치시켜야 합니다.
> 5. **Claude & Gemini AI 역할 분담 원칙**:
>    - **Claude**: **백엔드(Backend)** 전담 (NestJS, Prisma ORM, PostgreSQL DB, REST API 엔드포인트/비즈니스 로직, DTO 및 백엔드 문서/테스트)
>    - **Gemini**: **프론트엔드(Frontend)** 전담 (Next.js App Router, React 19, Tailwind CSS UI/UX, 상태 관리, 프론트엔드 API 클라이언트 연동 및 프론트 로그/에러 해결)
> 6. **프론트엔드 작업 완료 즉시 Git 커밋 및 푸시 (Auto Commit & Push)**: Gemini는 프론트엔드 작업 단위가 완료되고 빌드 검증(`next build` 성공)을 마칠 때마다 지체 없이 **Git 공식 커밋 컨벤션에 맞춰 커밋하고 원격 저장소(`git push`)에 즉시 반영**하여 최신 변경 사항을 항상 안전하게 유지해야 합니다.
> 7. **공유 핸드오프 로그(`AI_HANDOFF.md`) 기반 비동기 협업 프로토콜**: Claude가 백엔드 API/스키마/로직을 수정할 때마다 루트의 [`AI_HANDOFF.md`](AI_HANDOFF.md) 파일에 변경 내역 및 프론트엔드 연동 요구사항을 기록합니다. Gemini는 호출 시 또는 작업 시 [`AI_HANDOFF.md`](AI_HANDOFF.md)의 최신 내용을 확인하여 프론트엔드 코드(`src/lib/*-service.ts`, `src/app/*`)를 즉시 업데이트하고 상태를 동기화합니다.
> 8. **프론트엔드 작업 완료 시 Notion(노션) 마무리 동기화 (Notion Final Update)**: 프론트엔드 기능 개발, 화면 개선, 레이아웃 변경 등 작업이 완료될 때마다 노션(Notion) 워크스페이스의 해당 문서(WBS 진행률/태스크 상태, 서비스 기획서 및 요구사항 명세서, 프론트엔드 변경 내역 등)에 업데이트가 필요한 사항이 있다면 Notion MCP를 통해 항상 마무리 단계에서 최신 상태로 동기화 및 반영합니다.

---

## 🏫 1. 프로젝트 개요 (Overview)

- **프로젝트명**: ClassHelper (학원 통합 관리 SaaS 플랫폼)
- **목적**: 학원 원장님과 선생님들이 원생 관리, 1초 출결 체크, 수업 일지 및 과제 점검, 수강료 청구 및 수납 관리를 직관적이고 빠르게 처리할 수 있는 올인원 B2B 솔루션
- **아키텍처 모델**: PostgreSQL 기반의 멀티테넌시(Multi-Tenancy) 데이터 격리 아키텍처

---

## 🛠️ 2. 기술 스택 (Tech Stack)

### Backend
- **Framework**: NestJS (v11)
- **Language**: TypeScript (v5.7)
- **Database & ORM**: PostgreSQL 16 (Docker) + Prisma ORM (v7, `@prisma/adapter-pg`)
- **Authentication**: Passport.js, JWT (Access 15m + Refresh 7d RTR 체계), bcrypt
- **API Docs**: Swagger (OpenAPI 3.0)
- **Package Manager**: Yarn

### Frontend
- **Framework**: Next.js (App Router, React 19)
- **Language**: TypeScript (v5)
- **Styling**: Tailwind CSS (v4)
- **Server State**: TanStack Query v5 (React Query)
- **Client State**: Zustand
- **Form & Validation**: React Hook Form + Zod
- **Icons & Chart**: Lucide React, Recharts, date-fns
- **HTTP Client**: Axios (JWT 인터셉터 탑재)

---

## 🔒 3. 멀티테넌시 & 보안 절대 원칙 (Critical Rules)

### 3.1. 멀티테넌시 데이터 격리 (`academyId` 철저 분리)
1. **컨트롤러 계층**: 모든 인증된 요청은 `@CurrentUser('academyId')`를 통해 현재 사용자의 소속 학원 ID를 추출하여 서비스 계층에 전달합니다.
2. **서비스 & ORM 계층**: 
   - `SELECT`, `UPDATE`, `DELETE` 등 모든 DB 쿼리의 `where` 절에 **반드시 `academyId`를 포함**해야 합니다.
   - 외래 키 참조 시 타 학원의 `studentId`, `classId`, `invoiceId` 등에 접근하지 못하도록 원천 차단합니다.
   ```typescript
   // 올바른 예시
   const student = await this.prisma.student.findFirst({
     where: {
       id: studentId,
       academyId: currentUser.academyId, // 필수!
     },
   });
   ```

### 3.2. 이중 토큰 & RTR(Refresh Token Rotation) 정책
1. **Access Token (15분)**: API 요청 시 `Authorization: Bearer <token>` 헤더로 전송.
2. **Refresh Token (7일)**:
   - 평문 원본 저장 절대 금지. **`bcrypt`로 10 rounds 해싱**하여 DB(`User.hashedRefreshToken`)에 저장.
   - `POST /auth/refresh` 호출 시 새 Refresh Token을 재발급하고 DB 해시를 즉시 교체(RTR).
   - 비정상/재사용 토큰 감지 시 즉시 해당 사용자의 DB 토큰을 `null`로 초기화(강제 로그아웃).
3. **RBAC(역할 기반 접근 제어)**:
   - 권한 체계: `SUPER_ADMIN` > `OWNER` (원장) > `ADMIN` (실장/원무) > `TEACHER` (강사) > `STAFF` (조교)
   - 엔드포인트마다 `@UseGuards(JwtAuthGuard, RolesGuard)` 및 `@Roles(...)` 데코레이터를 적용하여 권한을 철저히 검증.

### 3.3. 환경 변수 및 민감 정보 보호 (.env 접근 금지)
1. **`.env` 파일 접근 절대 금지**: `.env`, `.env.local`, `.env.production` 등 일체의 환경 변수 파일에 대한 직접 읽기/조회/출력을 엄격히 금지합니다.
2. 환경 변수 설정이나 검증이 필요한 경우, 직접 `.env` 파일을 열람하지 않고 필요한 환경 변수 키 이름과 예시 형식(`.env.example` 등)으로만 소통합니다.

---

## 💻 4. 백엔드 개발 표준 및 코딩 컨벤션

1. **도메인 모듈화**:
   - `auth`, `admin`, `students`, `classes`, `attendance`, `tuition`, `class-logs` 단위로 기능 분리.
2. **DTO 및 유효성 검사**:
   - 모든 Request Body/Query/Param은 전용 DTO 클래스를 생성하고 `class-validator` 및 `class-transformer` 데코레이터 적용.
   - Swagger 문서화를 위해 모든 DTO 필드에 `@ApiProperty` 또는 `@ApiPropertyOptional` 필수 기재.
3. **Swagger 문서화**:
   - 컨트롤러 클래스에 `@ApiTags('도메인명')` 및 `@ApiBearerAuth('access-token')` 적용.
   - 메서드마다 `@ApiOperation({ summary, description })` 및 `@ApiResponse` 상세 명시.
4. **Prisma 7 규칙**:
   - Enum과 복합 인덱스(`@@index`, `@@unique`)를 적극 활용하여 쿼리 성능 최적화.
   - 여러 도메인 간 변경 작업(예: 수납 처리 및 청구서 상태 변경)은 반드시 `prisma.$transaction()` 사용.
5. **도메인·스키마·구조 문서 및 Notion 동기화 (`backend/docs/domains/` & Notion)**:
   - 도메인 로직, 프로젝트/디렉터리 구조, Prisma DB 스키마, API 엔드포인트 및 DTO 변경 시 `backend/docs/domains/` 폴더 내의 해당 도메인 명세 문서(`01-auth-and-admin.md` ~ `05-class-logs-and-homework.md` 등)와 **노션(Notion) 워크스페이스 내의 기획서, 요구사항 명세서, Data 모델링, APISpec, WBS를 반드시 함께 업데이트**하여 항상 최신 상태를 유지합니다.

---

## 🎨 5. 프론트엔드 개발 표준 및 코딩 컨벤션

1. **디렉터리 구조 (Next.js App Router)**:
   - `src/app/(auth)`: 로그인, 회원가입 등 비인증 화면
   - `src/app/(dashboard)`: 학원 관리자/강사용 메인 대시보드 화면
   - `src/components/ui`: 원자 단위 공통 UI 컴포넌트
   - `src/components/common`: Header, Sidebar, Modal, Table 등 공통 레이아웃
2. **상태 관리 분리**:
   - **서버 상태(Server State)**: TanStack Query v5 활용 (캐싱, 낙관적 업데이트, 백그라운드 동기화).
   - **클라이언트 상태(Client State)**: 로그인 유저, 현재 활성 테넌트 등 최소한의 상태만 Zustand로 관리.
3. **폼 핸들링**:
   - 폼 입력 및 유효성 검증은 React Hook Form + Zod 스키마로 일원화.
4. **UX/UI 디자인 원칙**:
   - PC뿐만 아니라 교실 내 태블릿/모바일 기기에서도 원활히 동작하는 반응형 UI.
   - 출결 체크, 수강생 배정 등 빈번한 조작은 터치 친화적이고 직관적인 1초 액션 UI 제공.

---

## 🌿 6. Git & 브랜치/커밋 공식 컨벤션

### 6.1. 브랜치 구조 및 라이프사이클

1. **기본 브랜치**:
   - `main`: 프로덕션 배포 가능한 안정 버전 (Production)
   - `dev`: 모든 개발 작업이 통합되는 개발 기준 브랜치 (Development Base)
2. **작업 브랜치 규칙 (분기: `dev` ➔ 머지: `dev`)**:
   - **백엔드 작업**: `feat/backend/<도메인>-<기능명>` (예: `feat/backend/attendance-qr-api`, `feat/backend/tuition-billing-calc`)
   - **프론트엔드 작업**: `feat/frontend/<도메인>-<기능명>` (예: `feat/frontend/attendance-dashboard-ui`, `feat/frontend/tuition-invoice-modal`)
   - **풀스택 통합 작업**: `feat/fullstack/<도메인>-<기능명>` (예: `feat/fullstack/attendance-checkin`)
   - **버그 수정**: `fix/backend/<도메인>-<수정명>`, `fix/frontend/<도메인>-<수정명>`
   - **긴급 운영 수정**: `hotfix/backend/<수정명>`, `hotfix/frontend/<수정명>` (분기: `main` ➔ 머지: `main` & `dev`)

### 6.2. 머지 전략 (Merge Strategy)
1. **`feat/*`, `fix/*` ➔ `dev` 머지 시**: **`Squash and Merge`**
   - 세부 작업 커밋들을 1개의 명확한 기능 단위 커밋으로 압축 머지하여 `dev` 히스토리 가독성 확보.
2. **`dev` ➔ `main` 머지 시**: **`Create a merge commit` (Merge Commit)**
   - 마일스톤 및 릴리스 배포 단위를 기록하고 버전 태그(`v1.x.x`) 부여.

### 6.3. 커밋 메시지 규칙 (`타입(영역/도메인): 설명`)
- **예시**:
  - `feat(backend/attendance): QR 코드 출결 검증 API 구현`
  - `feat(frontend/tuition): 수강료 청구서 모달 UI 컴포넌트 추가`
  - `docs(backend/docs): 03-attendance 도메인 명세 업데이트`

| 타입 | 설명 |
| :--- | :--- |
| **`feat`** | 새로운 기능 추가 |
| **`fix`** | 버그 수정 |
| **`docs`** | 문서 수정 (코드 변경 없음, `docs/` 폴더 동기화 등) |
| **`style`** | 코드 포맷팅, 세미콜론 등 스타일 변경 (논리 변경 없음) |
| **`refactor`** | 리팩토링 (기능 변화 없음) |
| **`test`** | 테스트 관련 코드 추가/수정 |
| **`chore`** | 빌드, 패키지 매니저 설정 등 기타 작업 |
| **`design`** | CSS, UI 디자인 스타일 변경 |
| **`comment`** | 필요한 주석 추가 및 변경 |
| **`rename`** | 파일 혹은 폴더명을 수정하거나 옮기는 작업 |
| **`remove`** | 파일을 삭제하는 작업만 수행한 경우 |
| **`!HOTFIX`** | 긴급 치명적 버그 수정 |

---

## 🚀 7. 프로젝트 주요 실행 명령어

```bash
# Docker DB 실행
docker compose up -d

# 모노레포 루트 실행 스크립트
yarn backend:dev             # 백엔드 개발 서버 실행 (localhost:3000)
yarn backend:prisma:migrate  # Prisma DB 마이그레이션 적용
yarn backend:prisma:generate # Prisma 클라이언트 생성
yarn frontend:dev            # 프론트엔드 개발 서버 실행 (localhost:3000 / 3001)
yarn frontend:build          # 프론트엔드 프로덕션 빌드
```

---

## 📋 8. 현재 개발 마일스톤 및 로드맵

- [x] **Phase 0~2**: 모노레포 세팅, PostgreSQL + Prisma 7 스키마 설계 및 마이그레이션
- [x] **Phase 3-1**: JWT 이중 토큰 인증, RBAC 인가, 플랫폼 슈퍼 관리자 포털 & 통합 대시보드
- [x] **Phase 3-2**: 원생 관리(Students) CRUD API, 실시간 검색/필터, 스마트 캘린더 연동 및 전용 웹 UI
- [x] **Phase 3-3**: 반(Classes) 개설, 스마트 원생 배정(Autocomplete Combobox) 및 수강생 매핑
- [x] **Phase 3-4**: 1초 출결 체크(Attendance) 및 카카오 알림톡/문자 발송 엔진, 시간대별 타임라인 아코디언 현황판
- [x] **Phase 3-6**: 수업 일지/진도 기록 및 과제(ClassLog & Homework) 1초 검사·피드백 관리 도메인
- [x] **Phase 3-5**: 수강료 청구 및 복합 수납 처리(Tuition & Payments) API & 전용 대시보드 UI
- [ ] **Phase 4**: E2E 통합 테스트 및 클라우드 배포 최적화

---

## 📑 9. Notion(노션) 워크스페이스 연동 및 활용 지침

1. **상시 동기화 및 참조 원칙**:
   - `GEMINI.md` 로드 시 또는 개발/기획/일정 논의 시 Notion MCP 서버(`notion_execute`, `notion_describe`)를 통해 최신 기획 및 WBS 문서를 조회합니다.
   - 주요 참조 대상:
     - `ClassHelper` 메인 워크스페이스
     - `WBS` 및 세부 일정/스프린트 태스크
     - `서비스 기획` 및 `요구사항 명세서 작성`
     - 각 도메인별 구현 명세서 및 `APISpec`
     - `Data 모델링` (ERD 및 DDL)
2. **구조 변경·도메인 수정·스키마 변경 시 노션 필수 업데이트 (Critical)**:
   - 프로젝트 디렉터리/아키텍처 구조 변경, 신규 도메인 추가, 기존 도메인 비즈니스 로직 수정, Prisma DB 스키마 및 마이그레이션 변경, API 엔드포인트/DTO 추가 및 변경이 발생할 때마다 **노션(Notion)의 해당 문서(요구사항 명세서, 서비스 기획서, Data 모델링, APISpec, WBS 등)를 Notion MCP를 통해 반드시 즉시 동기화/업데이트**하여 코드베이스와 기획/설계 문서를 항상 100% 일치시킵니다.
   - 개발 완료 및 주요 마일스톤 달성 시, WBS 작업 상태(진행률, 업무 항목 현황)를 함께 최신화합니다.
