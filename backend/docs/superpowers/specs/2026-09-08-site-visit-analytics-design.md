# 사이트 방문자 집계 (Site Visit Analytics) — 설계 문서

- 작성일: 2026-09-08
- 작성자: Claude (Backend)
- 상태: 설계 확정, 구현 대기

## 1. 배경 및 목적

플랫폼 관리자(SUPER_ADMIN)가 날짜별로 "사이트에 몇 명이 방문했는지"를 확인할 수 있는 메뉴를 관리자 포털(`/admin`)에 추가하려는 요청에서 시작. 현재 코드베이스에는 방문/페이지뷰를 기록하는 어떤 메커니즘도 존재하지 않아 신규로 설계한다.

## 2. 범위

**포함 (2026-09-08 확장)** — 사용자 요청으로 "오늘 방문자 수" 외에 로그인/회원가입/학원 개설 수까지 날짜별로 함께 보여주는 것으로 범위 확장:
- 비로그인 방문자(공개 랜딩/로그인 페이지) 날짜별 고유 방문자 수 집계 (신규 `SiteVisit` 필요)
- 로그인한 교직원 날짜별 고유 방문자("로그인") 수 집계 (신규 `SiteVisit` 필요)
- 날짜별 신규 회원가입 수 — `register-owner`/`register-staff`/`join-staff` 전부 포함 (기존 `User.createdAt` 재사용, **새 테이블 불필요**)
- 날짜별 신규 학원 개설 수 (기존 `Academy.createdAt` 재사용, **새 테이블 불필요**)
- SUPER_ADMIN이 날짜 범위로 위 4개 카테고리를 한 번에 조회하는 통계 API 1개

**"로그인 수"의 정의 (설계 결정, 확인 필요 시 알려주세요)**: 실제 로그인 시도 횟수(같은 사람이 하루에 여러 번 로그인해도 매번 카운트)가 아니라 **그날 로그인한 고유 사용자 수**로 정의한다 — 어차피 신규로 만드는 `SiteVisit`의 "로그인 방문자" 집계와 완전히 같은 데이터라 별도 이벤트 로그 테이블을 새로 만들 필요가 없다. 순수 로그인 시도 횟수(중복 포함)가 꼭 필요하면 별도 카운터가 추가로 필요하니 미리 알려주세요.

**제외 (이번 스코프 아님)**
- 학원별(OWNER 시점) 분해 통계 — `academyId`는 모델에 저장해 훗날 확장 여지는 남기지만, 이번 조회 API는 플랫폼 전체 합계만 반환
- 페이지 단위 상세 분석(어떤 URL을 봤는지, 체류시간, 퍼널/리텐션)
- 프론트엔드 UI(차트, beacon 호출 연동) — `AI_HANDOFF.md`로 Gemini에게 전달, 이 문서는 백엔드만 다룸

## 3. 핵심 제약

백엔드(NestJS)는 `/auth/*`, `/students/*` 같은 API 라우트만 처리하고, 공개 랜딩/로그인 페이지는 프론트(Next.js)가 자체 렌더링한다. 따라서 **비로그인 방문자는 프론트가 페이지 로드 시 신호(beacon)를 보내지 않는 한 백엔드가 절대 관측할 수 없다.** 이 문서는 그 beacon을 받는 공개 API까지만 설계하며, 실제 호출은 프론트 작업이다.

반대로 로그인 방문은 이미 백엔드가 관여하는 지점(`AuthService.login()`)이 있으므로 프론트 추가 연동 없이 훅만 추가하면 된다.

## 4. 데이터 모델

### 4.1. 신규 enum `VisitorType`
```prisma
enum VisitorType {
  ANONYMOUS // 비로그인 방문자 (공개 페이지)
  STAFF     // 로그인한 교직원
}
```

### 4.2. 신규 모델 `SiteVisit`
```prisma
model SiteVisit {
  id         BigInt      @id @default(autoincrement())
  visitDate  DateTime    @db.Date // 하루 단위로 truncate된 날짜(자정 UTC 기준)
  type       VisitorType
  dedupKey   String      @db.VarChar(120) // 로그인: "user:{userId}", 비로그인: "anon:{visitorId}"
  userId     Int?
  academyId  Int?        // 로그인 방문만 채워짐. 학원별 분해는 이번 스코프 아니지만 훗날을 위해 저장.

  createdAt  DateTime    @default(now())

  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  academy    Academy? @relation(fields: [academyId], references: [id], onDelete: SetNull)

  @@unique([visitDate, dedupKey])
  @@index([visitDate])
  @@map("site_visits")
}
```

- **왜 단일 테이블인가**: 별도 롤업/집계 배치 없이 `GROUP BY visitDate` 한 번으로 통계를 낼 수 있고, `@@unique([visitDate, dedupKey])`가 "같은 날 같은 방문자는 1번만 카운트"를 DB 레벨에서 보장한다(중복 insert는 그냥 무시).
- **`dedupKey`를 문자열 하나로 합친 이유**: `userId`(로그인)와 `visitorId`(익명, UUID 문자열)는 타입이 다르고 상호 배타적이라, 두 개의 nullable unique 조합을 partial index 없이 Prisma로 표현하기 까다롭다. prefix로 구분한 문자열 하나면 단순한 `@@unique`로 충분하다.
- **`User`/`Academy`와의 관계는 `onDelete: SetNull`**: 방문 로그는 감사 기록에 가까우므로, 유저가 나중에 삭제되어도(현재는 소프트 삭제라 실제로는 거의 없지만 방어적으로) 로그 자체는 남기고 FK만 끊는다.

### 4.3. 마이그레이션
신규 파일 `prisma/migrations/<timestamp>_add_site_visits/migration.sql` — `CREATE TYPE`, `CREATE TABLE`, unique/index 생성. 기존 세션들과 동일하게 이 세션도 DB 접근 권한을 확인 후 가능하면 실제로 `migrate deploy`까지 실행해 로컬 dev DB에도 반영한다(직전 세션에서 로컬 DB가 여러 마이그레이션 밀려서 로그인 500 에러가 났던 전례가 있으므로, 이번엔 만들고 바로 적용까지 확인).

## 5. API

### 5.1. `POST /analytics/track` (공개, 비인증)
- **Request Body**: `{ "visitorId": "<client-generated UUID>" }`
- **동작**: `dedupKey = "anon:" + visitorId`, `type = ANONYMOUS`, `visitDate = 오늘(서버 기준)`으로 upsert(중복이면 무시). `visitorId`는 UUID 형식 검증(`@IsUUID()`)만 하고 그 외 아무 정보도 남기지 않는다 — IP/User-Agent 등은 저장하지 않아 PII 최소화.
- **Response**: `204 No Content` (또는 최소 `{ success: true }`) — 프론트가 결과를 신경 쓸 필요 없는 fire-and-forget 성격.
- **Throttle**: `/auth/login`과 동일 수준(60초 5회) — 공개 엔드포인트이므로 스팸성 대량 호출 방지. 어차피 dedup되므로 카운트 조작은 안 되지만, 무의미한 쓰기 폭주 자체를 막는 목적.

### 5.2. `GET /analytics/stats?startDate=&endDate=` (SUPER_ADMIN 전용)
- **Query**: `startDate`, `endDate` (YYYY-MM-DD, 생략 시 최근 30일)
- **Response**: 날짜별 배열, 4개 카테고리를 한 항목에 모두 담아 반환(프론트에서 한 번의 호출로 여러 지표를 그릴 수 있도록):
  ```json
  [
    {
      "date": "2026-09-08",
      "anonymousVisitors": 42,
      "loginCount": 15,
      "newSignups": 3,
      "newAcademies": 1
    }
  ]
  ```
  - `anonymousVisitors`, `loginCount`: `SiteVisit`을 `visitDate`+`type`으로 group by한 distinct 카운트.
  - `newSignups`: `User.createdAt`이 해당 날짜에 속하는 행 수(전 역할 통합 — OWNER/ADMIN/TEACHER/STAFF 구분 없이 합계).
  - `newAcademies`: `Academy.createdAt`이 해당 날짜에 속하는 행 수.
- **동작**: 4개의 group-by 쿼리(또는 raw SQL 1개로 합성)를 날짜 범위로 실행 후 날짜 기준으로 병합, 방문/로그인 기록이 없는 날짜도 0으로 채워 배열에 빈 구간 없이 반환(프론트 차트가 날짜 축을 연속으로 그릴 수 있도록).
- 학원 스코프 없음(플랫폼 전체 SUPER_ADMIN 전용이므로 `academyId` 필터 자체가 없는 게 정상 — `admin` 모듈의 기존 `GET /admin/stats`와 동일한 성격).
- **오늘 하루 요약이 필요한 경우**: 프론트가 `startDate=endDate=오늘`로 이 API를 그대로 호출하면 되므로 별도의 "오늘 요약" 전용 엔드포인트는 만들지 않는다(중복 로직 방지).

## 6. 로그인 훅

`AuthService.login()` 성공 직후(토큰 발급 이후), `dedupKey = "user:" + user.id`, `type = STAFF`, `userId`, `academyId`로 upsert. **반드시 try/catch로 감싸 방문 기록 실패가 로그인 자체를 절대 막지 않도록 한다** — 통계 기능이 핵심 인증 흐름의 가용성을 해치면 안 된다는 원칙.

## 7. 모듈 구조

신규 `src/analytics/` 모듈 (`AnalyticsController`, `AnalyticsService`, `AnalyticsModule`) — `admin`처럼 독립 모듈로 구성한다(계정 인증이 아닌 통계 조회가 핵심 책임이라 `auth`/`admin`에 얹기보다 분리가 자연스러움). `AuthService`는 `AnalyticsService`를 주입받아 로그인 훅에서 호출한다(순환 의존 방지를 위해 `AnalyticsModule`을 `AuthModule`이 import).

## 8. 에러 처리
- `POST /analytics/track`: `visitorId` 형식 오류 시 `400`. 그 외에는 항상 성공(중복도 성공 취급).
- `GET /analytics/stats`: 잘못된 날짜 형식 `400`. `SUPER_ADMIN` 아니면 `403`(기존 `admin` 모듈과 동일한 `RolesGuard` 패턴 재사용).

## 9. 테스트 계획
- `analytics.service.spec.ts` 신규: track 성공/중복 무시/UUID 검증, stats 날짜범위 집계(방문/로그인/가입/학원개설 4개 카테고리 각각 정확한 그룹핑), 데이터 없는 날짜 0으로 채워지는지, 기본 30일 range.
- `auth.service.spec.ts`: 로그인 성공 시 방문 기록 호출 확인, 방문 기록이 예외를 던져도 로그인 자체는 성공하는 케이스 추가.

## 10. 프론트 연동 요구사항 (구현 후 `AI_HANDOFF.md`로 전달 예정)
1. 공개 페이지(랜딩 `/`, `/login`) 최초 마운트 시 `localStorage`에 없으면 UUID 생성/저장 후 `POST /analytics/track` 1회 호출(페이지 이동마다 반복 호출할 필요 없음 — 세션당/일 1회면 충분, 서버가 dedup하므로 과호출해도 안전하지만 불필요한 트래픽 방지 차원에서 "오늘 이미 보냈으면 스킵" 정도는 프론트에서 캐시 권장).
2. 관리자 포털(`/admin`)에 날짜별 방문자 수 차트(신규 메뉴) 추가, `GET /analytics/stats` 연동.

## 11. 자체 검토 체크리스트
- [x] TBD/placeholder 없음
- [x] 섹션 간 모순 없음(단일 테이블·단일 dedup 방식으로 일관)
- [x] 범위: 단일 기능(방문 집계)으로 한정, 분해 불필요
- [x] 모호한 요구사항 없음 — 익명/로그인 구분, SUPER_ADMIN 전용 범위 모두 사용자 확답 반영
