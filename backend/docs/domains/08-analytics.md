# 📈 08. 방문 통계 도메인 (Analytics Domain)

## 📌 도메인 개요

방문 통계 도메인은 **플랫폼 관리자(SUPER_ADMIN)가 날짜별로 사이트 방문/로그인/가입/학원개설 현황을 확인**할 수 있게 하는 최소 구현입니다. 다른 도메인과 달리 `academyId`로 스코프하지 않습니다 — 플랫폼 전체를 대상으로 하는 SUPER_ADMIN 전용 기능이기 때문입니다.

**중요**: 신규 가입자 수(`newSignups`)와 신규 학원 개설 수(`newAcademies`)는 별도 추적 테이블 없이 기존 `User.createdAt`/`Academy.createdAt`을 날짜별로 집계한 값입니다. 오직 "방문"(비로그인 페이지 방문 + 로그인 사용자 방문)만 신규 `SiteVisit` 테이블이 필요합니다.

---

## 🗄️ 1. 관련 엔티티 (Entities)

### 1) `SiteVisit` (방문 기록)
* **역할**: 하루 단위로 중복 제거된 방문 이벤트 1건. `academyId`로 스코프되지 않는 유일한 신규 모델(의도적).
* **방문자 유형 (`VisitorType`)**:
  * `ANONYMOUS`: 비로그인 방문자(공개 랜딩/로그인 페이지)
  * `STAFF`: 로그인한 교직원
* **주요 필드**:
  * `visitDate`: 하루 단위로 truncate된 날짜(`@db.Date`)
  * `dedupKey`: 로그인은 `user:{userId}`, 비로그인은 `anon:{visitorId}`(프론트가 생성한 UUID) — `@@unique([visitDate, dedupKey])`로 같은 날 같은 방문자는 1건만 유지
  * `userId?` / `academyId?`: 로그인 방문에만 채워짐(비로그인은 둘 다 null)
* **저장하지 않는 것(의도적)**: IP 주소, User-Agent, 페이지 경로 등 — 익명 방문자를 식별 가능한 정보 없이 UUID 하나로만 추적해 PII 저장을 최소화합니다.

---

## 👥 2. 역할별 권한 매트릭스 (Role Permissions Matrix)

| 기능 / API | SUPER_ADMIN | OWNER | ADMIN | TEACHER | STAFF | 비인증 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **익명 방문 기록 (`POST /analytics/track`)** | - | - | - | - | - | ✅ |
| **날짜별 통계 조회 (`GET /analytics/stats`)** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

`POST /analytics/track`은 로그인 여부와 무관하게 항상 열려 있는 공개 엔드포인트입니다(랜딩페이지 방문자는 애초에 로그인 상태가 아니므로).

---

## 🔄 3. 방문 기록 흐름

```text
[ 비로그인 방문 ]                          [ 로그인 방문 ]
       │                                        │
   (프론트가 로컬 UUID 생성/재사용)                  (POST /auth/login 성공)
       │                                        │
       ▼                                        ▼
POST /analytics/track                  AuthService.login() 내부에서
(공개, Throttle 60초 5회)               AnalyticsService.recordStaffVisit()
       │                                호출 (실패해도 로그인은 절대 막지 않음)
       └──────────────┬─────────────────────────┘
                       ▼
         SiteVisit.upsert(visitDate+dedupKey)
         — 같은 날 같은 방문자는 자동으로 1건만 유지
                       │
                       ▼
         GET /analytics/stats (SUPER_ADMIN)
         — SiteVisit + User.createdAt + Academy.createdAt을
           날짜별로 병합, 빈 날짜는 0으로 채워 반환
```

---

## 📡 4. RESTful API 명세 (API Specifications)

> 구현 위치: `backend/src/analytics/` (`analytics.controller.ts`, `analytics.service.ts`)

### 4.1. 익명 방문 기록
* **엔드포인트**: `POST /analytics/track` (인증 불필요)
* **Request Body (`TrackVisitDto`)**: `{ "visitorId": "a1b2c3d4-e5f6-4789-a012-3456789abcde" }` — 프론트가 로컬(localStorage 등)에 생성/보관하는 UUID.
* **Response Body (`TrackVisitResponseDto`)**: `{ "success": true }`
* **동작 특성**: 같은 날 같은 `visitorId`는 중복 집계되지 않는다(서버 dedup). `visitorId`가 UUID 형식이 아니면 `400`. `/auth/login`과 동일한 Throttle(60초 5회).

### 4.2. 로그인 방문 기록 (별도 엔드포인트 없음)
`AuthService.login()` 성공 시 자동으로 기록된다 — 프론트 연동 불필요. 방문 기록이 실패해도 로그인 자체는 절대 실패하지 않는다(내부적으로 try/catch, 경고 로그만 남김).

### 4.3. 날짜별 통계 조회
* **엔드포인트**: `GET /analytics/stats?startDate=&endDate=` (`SUPER_ADMIN`)
* **Query**: `startDate`, `endDate` (YYYY-MM-DD, 둘 다 생략 시 오늘 기준 최근 30일)
* **Response Body (`DailyAnalyticsStatsDto[]`)**:
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
  * `anonymousVisitors` / `loginCount`: 해당 날짜의 `SiteVisit` 고유 방문자 수(타입별).
  * `newSignups`: 해당 날짜 `User.createdAt` 기준 신규 가입자 수(전 역할 통합, `SUPER_ADMIN` 제외).
  * `newAcademies`: 해당 날짜 `Academy.createdAt` 기준 신규 개설 학원 수.
* **동작 특성**: 요청 범위 내 모든 날짜를 빠짐없이 포함하며(데이터 없는 날짜는 0), `SUPER_ADMIN`이 아니면 `403`.

### 4.4. "로그인 수"의 정의 (설계 결정)
실제 로그인 시도 횟수(같은 사람이 여러 번 로그인하면 매번 카운트)가 아니라 **그날 로그인한 고유 사용자 수**입니다. 순수 로그인 시도 횟수(중복 포함)가 필요하면 별도 이벤트 로그가 추가로 필요합니다 — 현재 미구현.

---

## ⚠️ 5. 알려진 프론트-백엔드 계약 불일치 (2026-09-08)

같은 세션 중 프론트(`frontend/src/app/admin/page.tsx`, `frontend/src/lib/admin-service.ts`)가 독립적으로 "사이트 방문자 분석" 화면을 이미 구현해뒀는데, 기대하는 API 계약이 이 문서의 실제 구현과 다릅니다:

| 항목 | 프론트가 기대하는 것 | 이 도메인의 실제 구현 |
| :--- | :--- | :--- |
| 엔드포인트 | `GET /admin/visitors` | `GET /analytics/stats` |
| 페이지뷰(PV) | `pageViews` 필드 포함 | 미집계(고유 방문자만 추적) |
| 신규/재방문 구분 | `newVisitors`/`returningVisitors` | 미구현(파생 가능하나 미구현) |
| 기기 비율 | `deviceBreakdown`(desktop/mobile/tablet %) | 미집계(User-Agent 자체를 저장하지 않음 — PII 최소화 설계) |
| 최다 이용 서비스 | `topService` (일자별 가장 많이 쓰인 기능) | 범위 밖(페이지/기능별 사용 통계는 별도 도메인) |
| 신규가입/학원개설 수 | 없음 | `newSignups`/`newAcademies` 포함 |

프론트는 현재 이 엔드포인트가 없어 **가짜 목업 데이터**(`generateMockVisitorData()`)를 보여주고 있다. 두 설계를 어떻게 합칠지는 사용자 확인 후 결정 예정 — 자세한 내용은 세션 대화 기록 참고.
