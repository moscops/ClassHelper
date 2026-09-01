# 📚 ClassHelper 백엔드 개발자 가이드 (Backend Docs)

환영합니다! **ClassHelper** 백엔드는 [NestJS](https://nestjs.com/)와 [Prisma 7](https://www.prisma.io/), [PostgreSQL 16](https://www.postgresql.org/)을 기반으로 설계된 멀티테넌트 학원 통합 관리 플랫폼 API 서버입니다.

이 문서는 프로젝트의 도메인 아키텍처, 데이터베이스(Prisma 7) 운용 가이드, Swagger API 명세 활용법, 그리고 인증/인가 시스템의 사용법을 정리한 개발자 설명서입니다.

---

## 📑 목차 (Table of Contents)

- [🏛️ 도메인 아키텍처 및 역할별 가이드](./domain-architecture.md)
  - 5대 핵심 도메인 모델링 및 비즈니스 흐름
  - 멀티테넌시(Multi-Tenancy) 데이터 격리 구조
  - 역할별 권한(Role-Based Access Control) 체계
- [🗄️ Prisma & 데이터베이스 가이드](./prisma-guide.md)
  - Prisma 7 드라이버 어댑터(`@prisma/adapter-pg`) 동작 원리
  - 마이그레이션 및 Prisma CLI 명령어
  - 트랜잭션 및 쿼리 작성 패턴
- [📑 Swagger & API 활용 가이드](./swagger-api-guide.md)
  - Swagger UI 접속 및 Bearer JWT 인증 방법
  - DTO 유효성 검사 및 에러 응답 규격
  - 주요 API 엔드포인트 카탈로그
- [🔐 인증 & 인가(Security) 가이드](./auth-and-security.md)
  - JWT 발급 및 검증 라이프사이클
  - `@CurrentUser()` / `@Roles()` 데코레이터 및 Guard 사용법
  - 비밀번호 단방향 암호화 정책

---

## 🛠️ 기술 스택 요약

| 분류 | 기술 | 버전 | 설명 |
| :--- | :--- | :--- | :--- |
| **Framework** | NestJS | `^11.0.1` | 엔터프라이즈급 모듈형 Node.js 백엔드 프레임워크 |
| **Language** | TypeScript | `^5.7.3` | 정적 타입 지원 |
| **Database** | PostgreSQL | `16-alpine` | 신뢰성 높은 오픈소스 관계형 데이터베이스 |
| **ORM** | Prisma | `^7.9.1` | 차세대 타입 세이프 ORM (Driver Adapter 모드) |
| **Auth** | Passport & JWT | `^11.0.5` | Stateless Access Token 기반 인증 및 RBAC 인가 |
| **API Docs** | Swagger (OpenAPI) | `^11.4.7` | 인터랙티브 API 명세서 자동 생성 |
| **Testing** | Jest | `^30.0.0` | 단위(Unit) 및 통합(E2E) 테스트 도구 |

---

## ⚡ 빠른 시작 (Quick Start)

### 1. 의존성 설치
```bash
cd backend
yarn install
```

### 2. 환경 변수 설정
`.env.example`을 복사하여 `.env`를 생성합니다.
```bash
cp .env.example .env
```

`.env` 파일 내용:
```env
DATABASE_URL="postgresql://classhelper_user:classhelper_password@localhost:5432/classhelper_db?schema=public"
PORT=3000
JWT_SECRET="super-secret-classhelper-jwt-key"
JWT_EXPIRES_IN="7d"
```

### 3. 로컬 PostgreSQL 데이터베이스 실행
프로젝트 루트 디렉토리의 Docker Compose를 실행합니다.
```bash
# 프로젝트 루트(ClassHelper/)에서 실행
docker compose up -d
```

### 4. Prisma 마이그레이션 적용 및 클라이언트 생성
```bash
yarn prisma:migrate
yarn prisma:generate
```

### 5. 개발 서버 실행
```bash
yarn start:dev
```
- 서버 주소: `http://localhost:3000`
- Swagger API 문서: `http://localhost:3000/api-docs`

---

## 📂 백엔드 디렉토리 구조

```text
src/
├── common/               # 프로젝트 전역 공통 모듈
│   ├── decorators/       # 커스텀 데코레이터 (@Roles, @CurrentUser, @Public)
│   └── guards/           # 인가/인증 가드 (JwtAuthGuard, RolesGuard)
├── prisma/               # Prisma 연결 및 생명주기 관리 모듈
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── auth/                 # 인증/인가 및 계정 관리 도메인
│   ├── dto/              # 요청/응답 DTO (Register, Login, Profile)
│   ├── strategies/       # Passport JWT 전략
│   ├── auth.controller.ts
│   ├── auth.service.ts
├── students/             # 원생 관리 도메인
│   ├── dto/              # 원생 등록, 수정, 필터, 응답 DTO
│   ├── students.controller.ts
│   ├── students.service.ts
│   └── students.module.ts
├── classes/              # 반 개설 및 수강 관리 도메인
├── attendance/           # 출결 관리 도메인
├── notifications/        # 알림 및 카카오 안심 알림톡/SMS 발송 도메인
├── tuition/              # 수강료 청구 및 수납 도메인
├── class-logs/           # 수업 일지 및 진도/과제 도메인
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts               # 애플리케이션 진입점 & Swagger 설정
```
