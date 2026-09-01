# 📅 06. 캘린더 도메인 (Calendar Domain)

## 📌 도메인 개요

캘린더 도메인은 **학원 공식 행사·시험·특강·휴원·학부모 상담 주간 등의 일정(AcademyEvent)을 관리**합니다. 반별 정규 수업 시간표는 이 도메인이 별도로 관리하지 않으며, `classes` 도메인의 `Class.schedule`(자유 텍스트 요일/시간)과 `GET /classes/:id/enrollments`를 조합해 프론트엔드에서 날짜별로 계산합니다.

---

## 🗄️ 1. 관련 엔티티 (Entities)

### 1) `AcademyEvent` (학원 이벤트)
* **역할**: 학원 전체에 공유되는 단일/기간 이벤트 일정.
* **카테고리 (`EventCategory`)**:
  * `ACADEMY`: 학원 공식 행사 / 설명회
  * `EXAM`: 정기/모의고사 / 학교 시험대비
  * `SPECIAL`: 특강 / 보강
  * `HOLIDAY`: 공휴일 / 정기 휴원
  * `CONSULTATION`: 학부모 상담 주간
  * `OTHER`: 기타
* **표시 색상 (`EventColor`)**: `INDIGO`, `PURPLE`, `ROSE`, `AMBER`, `EMERALD`, `BLUE`, `SLATE` — 캘린더 UI에서 카테고리별 배지/점 색상으로 사용.
* **주요 필드**:
  * `title`: 이벤트 제목
  * `startDate` / `endDate`: 시작/종료 일자 (`endDate`는 여러 날에 걸친 이벤트에만 사용, 단일 날짜면 생략)
  * `startTime` / `endTime`: 시작/종료 시각 (`HH:mm`, 종일 이벤트면 생략)
  * `description`: 상세 설명

---

## 👥 2. 역할별 권한 매트릭스 (Role Permissions Matrix)

| 기능 / 작업 | SUPER_ADMIN | OWNER | ADMIN | TEACHER | STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **학원 이벤트 목록 조회** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **학원 이벤트 생성/수정/삭제** | ✅ | ✅ | ✅ | ❌ | ❌ |

조회는 학원 캘린더를 확인해야 하는 모든 역할에 열려 있으며, 일정 등록/변경은 학원을 대표해 공식 일정을 관리하는 `OWNER`/`ADMIN`(및 `SUPER_ADMIN`)으로 제한합니다.

---

## 🔄 3. 이벤트 등록 라이프사이클

```text
[ 1. OWNER/ADMIN이 이벤트 등록 ]
       │  (POST /calendar/events)
       ▼
[ 2. 캘린더 월/주/아젠다 뷰에 즉시 노출 ]
       │  (GET /calendar/events — 전 역할 조회 가능)
       │
       ├── (변경 발생 시)
       │      ▼
       │   [ PATCH /calendar/events/:id ] ──> 수정된 내용으로 즉시 재노출
       │
       └── (일정 취소 시)
              ▼
           [ DELETE /calendar/events/:id ] ──> 캘린더에서 제거
```

---

## 📡 4. RESTful API 명세 (API Specifications)

> 구현 위치: `backend/src/calendar/` (`calendar.controller.ts`, `calendar.service.ts`). 모든 엔드포인트는 `JwtAuthGuard` + `RolesGuard`로 보호되며, `@CurrentUser('academyId')`로 테넌시가 강제됩니다.

### 4.1. 학원 이벤트 목록 조회
* **엔드포인트**: `GET /calendar/events`
* **권한**: 인증된 모든 역할 (`SUPER_ADMIN`, `OWNER`, `ADMIN`, `TEACHER`, `STAFF`)
* **Response Body (`EventResponseDto[]`)**:
  ```json
  [
    {
      "id": 1,
      "academyId": 1,
      "title": "2학기 학부모 설명회",
      "category": "ACADEMY",
      "color": "INDIGO",
      "startDate": "2026-09-15",
      "endDate": null,
      "startTime": "16:00",
      "endTime": "18:00",
      "description": "2026학년도 2학기 커리큘럼 및 입시 설명회",
      "createdAt": "2026-08-20T02:10:00.000Z",
      "updatedAt": "2026-08-20T02:10:00.000Z"
    }
  ]
  ```
* **동작 특성**: 날짜 필터를 두지 않고 학원 전체 이벤트를 `startDate` 오름차순으로 반환합니다 — 월/주/아젠다 단위 그룹핑은 프론트엔드에서 처리합니다.

### 4.2. 학원 이벤트 생성
* **엔드포인트**: `POST /calendar/events`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`
* **Request Body (`CreateEventDto`)**:
  ```json
  {
    "title": "2학기 학부모 설명회",
    "category": "ACADEMY",
    "color": "INDIGO",
    "startDate": "2026-09-15",
    "startTime": "16:00",
    "endTime": "18:00",
    "description": "2026학년도 2학기 커리큘럼 및 입시 설명회"
  }
  ```
  * `color`는 선택 값이며, 생략 시 `INDIGO`가 기본값입니다.

### 4.3. 학원 이벤트 수정
* **엔드포인트**: `PATCH /calendar/events/:id`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`
* **Request Body (`UpdateEventDto`)**: `CreateEventDto`의 모든 필드가 선택 값으로 전환된 형태 (변경할 필드만 전송).
* **동작 특성**: 다른 학원 소속 이벤트 `id`를 지정하면 404를 반환합니다(테넌시 격리).

### 4.4. 학원 이벤트 삭제
* **엔드포인트**: `DELETE /calendar/events/:id`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`
* **동작 특성**: 다른 학원 소속 이벤트 `id`를 지정하면 404를 반환합니다(테넌시 격리).
