# ⏰ 03. 일별 출결 및 알림톡 도메인 (Attendance & Notifications Domain)

## 📌 도메인 개요

출결 & 알림 도메인은 **교실 내에서 모바일/태블릿 터치 한 번으로 학생의 출결 상태를 1초 만에 기록하고, 학부모에게 실시간 카카오 알림톡(등원/하원/결석/지각)을 자동 발송**하는 학원 운영의 핵심 접점 도메인입니다.

---

## 🗄️ 1. 관련 엔티티 (Entities)

### 1) `Attendance` (출결 기록)
* **역할**: 학생별, 반별, 일별 출결 현황 및 등/하원 시각 보관.
* **출결 상태 (`AttendanceStatus`)**:
  * `PRESENT`: 정상 출석 (등원 완료)
  * `ABSENT`: 결석 (사유 기록 및 보강 필요 여부 체크)
  * `LATE`: 지각 (도착 시각 및 지각 사유 기록)
  * `EARLY_LEAVE`: 조퇴 (조퇴 시각 및 사유 기록)
* **주요 필드**:
  * `id`: 고유 ID (`BigInt` ➔ 응답 DTO에서 `Number`로 직렬화)
  * `academyId`: 소속 학원 ID (멀티테넌시 격리)
  * `studentId`: 수강생 ID
  * `classId`: 수업 반 ID
  * `date`: 출결 기준 일자 (`YYYY-MM-DD`, `@db.Date`)
  * `status`: 출결 상태 (`PRESENT`, `ABSENT`, `LATE`, `EARLY_LEAVE`)
  * `checkInTime`: 등원 시각 (DateTime)
  * `checkOutTime`: 하원 시각 (DateTime)
  * `reason`: 지각/결석/조퇴 사유
  * `isMakeupNeeded`: 보강 수업 필요 여부 (`boolean`, 기본값 `false`)
  * `isMakeupCompleted`: 보강 완료 여부 (`boolean`, 기본값 `false`)
  * `memo`: 출결 관련 특이사항 메모
* **복합 인덱스 & 유니크 제약**:
  * `@@unique([studentId, classId, date])`: 동일 학생, 동일 반, 동일 일자에는 1개의 출결 레코드만 존재 (Upsert 보장)
  * `@@index([academyId, date])`, `@@index([classId, date])`, `@@index([studentId, date])`

---

## 👥 2. 역할별 권한 매트릭스 (Role Permissions Matrix)

| 기능 / 작업 | SUPER_ADMIN | OWNER | ADMIN | TEACHER | STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **단일 학생 출결 기록 / 수정 (`POST /attendance/record`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **반 전체 1초 일괄 출결 체크 (`POST /attendance/batch`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **1초 원터치 등/하원 체크 (`POST /attendance/quick-check`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **반 일별 출결 현황판 조회 (`GET /attendance/roster`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **출결 내역 검색/목록 (`GET /attendance`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **보강(Makeup) 대상자 지정 및 완료 처리 (`PATCH /attendance/:id/makeup`)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **학원 출결 통계 및 요약 분석 (`GET /attendance/stats`)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **출결 기록 삭제 (`DELETE /attendance/:id`)** | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 📱 3. 1초 출결 체크 및 알림톡 발송 흐름

```text
[ 교실/데스크 (선생님) ]
       │
       │─── 1. [김민준] 원터치 "등원" 터치 ───┐
       ▼                                     ▼
[ NestJS 출결 엔진 (Backend) ]        [ 카카오 알림톡 API (BizMSG) ]
       │                                     │
       ├── 2. 출결 DB 저장 (PRESENT, 17:30)  │── 4. 학부모 카카오톡 메시지 수신
       │                                     │     "안녕하세요, [김민준] 학생이
       └── 3. 알림톡 템플릿 렌더링 ──────────┘      17시 30분에 안전하게 등원했습니다."
```

---

## 🌐 4. API 명세 (API Specifications)

### 4.1. 단일 출결 등록/수정 (Upsert)
* **엔드포인트**: `POST /attendance/record`
* **Request Body (`RecordAttendanceDto`)**:
  ```json
  {
    "studentId": 1,
    "classId": 1,
    "date": "2026-08-27",
    "status": "PRESENT",
    "checkInTime": "2026-08-27T17:30:00.000Z",
    "checkOutTime": "2026-08-27T19:00:00.000Z",
    "reason": "사유 (선택)",
    "isMakeupNeeded": false,
    "memo": "메모 (선택)"
  }
  ```

### 4.2. 반 전체 1초 일괄 출결 체크 (Batch Upsert)
* **엔드포인트**: `POST /attendance/batch`
* **Request Body (`BatchAttendanceDto`)**:
  ```json
  {
    "classId": 1,
    "date": "2026-08-27",
    "records": [
      { "studentId": 1, "status": "PRESENT", "checkInTime": "2026-08-27T17:30:00.000Z" },
      { "studentId": 2, "status": "ABSENT", "reason": "개인 사정", "isMakeupNeeded": true }
    ]
  }
  ```

### 4.3. 1초 빠른 원터치 등/하원 체크
* **엔드포인트**: `POST /attendance/quick-check`
* **Request Body (`QuickCheckDto`)**:
  ```json
  {
    "studentId": 1,
    "classId": 1,
    "type": "CHECK_IN",
    "date": "2026-08-27",
    "time": "2026-08-27T17:30:00.000Z"
  }
  ```

### 4.4. 반 일별 전체 수강생 출결 현황판 (Daily Roster)
* **엔드포인트**: `GET /attendance/roster?classId=1&date=2026-08-27`
* **Response Body (`ClassDailyRosterResponseDto`)**:
  ```json
  {
    "class": { "id": 1, "name": "중등 수학 심화반", "schedule": "월/수/금 17:00-19:00" },
    "date": "2026-08-27",
    "totalStudents": 15,
    "presentCount": 13,
    "absentCount": 1,
    "lateCount": 1,
    "earlyLeaveCount": 0,
    "unmarkedCount": 0,
    "students": [
      {
        "studentId": 1,
        "studentName": "김민준",
        "grade": "중2",
        "studentPhone": "010-1234-5678",
        "parentPhone": "010-9876-5432",
        "attendance": { "id": 101, "status": "PRESENT", "checkInTime": "2026-08-27T17:30:00.000Z" }
      }
    ]
  }
  ```

### 4.5. 출결 통계 및 요약 분석
* **엔드포인트**: `GET /attendance/stats?classId=1&startDate=2026-08-01&endDate=2026-08-27`
* **Response Body (`AttendanceStatsResponseDto`)**:
  - `totalRecords`, `totalPresent`, `totalAbsent`, `totalLate`, `averageAttendanceRate` (%)
  - `makeupNeededCount`, `makeupCompletedCount`
  - `dailyStats`: 일자별 출결 집계 및 출석률 추이 배열

### 4.6. 보강(Makeup) 대상 지정 및 완료 처리
* **엔드포인트**: `PATCH /attendance/:id/makeup`
* **Request Body (`UpdateMakeupDto`)**:
  ```json
  {
    "isMakeupNeeded": true,
    "isMakeupCompleted": false,
    "memo": "8월 29일 금요일 18:00 개별 보강 예정"
  }
  ```
