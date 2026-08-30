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

### 2) `Notification` (알림 및 카카오톡/SMS 발송 기록)
* **역할**: 미등원/지각 경고, 등원/하원 완료 알림, 수강료 납부 안내, 시스템 공지 및 발송 채널별(인앱/카카오/SMS) 이력 보관.
* **알림 유형 (`NotificationType`)**:
  * `UNATTENDED_ALERT`: 수업 시작 시간 경과 미등원/지각 경고 알림
  * `ATTENDANCE_CHECKIN`: 등원 완료 알림
  * `ATTENDANCE_CHECKOUT`: 하원 완료 알림
  * `TUITION_DUE`: 수강료 납부 안내
  * `SYSTEM_NOTICE`: 시스템 공지
* **발송 채널 (`NotificationChannel`)**: `IN_APP` (웹 인앱 알림), `KAKAO` (카카오 알림톡), `SMS` (대체 문자)
* **발송 상태 (`NotificationStatus`)**: `SENT` (발송 완료), `DELIVERED` (수신 확인), `FAILED` (발송 실패)
* **주요 필드**:
  * `id`: 고유 ID (`Int`)
  * `academyId`: 소속 학원 ID (멀티테넌시 격리)
  * `studentId`: 대상 학생 ID
  * `classId`: 대상 수업 반 ID
  * `type`, `channel`, `status`, `title`, `message`, `targetPhone`, `isRead`, `readAt`, `metadata`

---

## 👥 2. 역할별 권한 매트릭스 (Role Permissions Matrix)

| 기능 / 작업 | SUPER_ADMIN | OWNER | ADMIN | TEACHER | STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **단일 학생 출결 기록 / 수정 (`POST /attendance/record`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **반 전체 1초 일괄 출결 체크 (`POST /attendance/batch`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **1초 원터치 등/하원 체크 (`POST /attendance/quick-check`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **반 일별 출결 현황판 조회 (`GET /attendance/roster`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **출결 내역 검색/목록 (`GET /attendance`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **미등원 감지 및 경고 상태 조회 (`GET /attendance/unattended-status`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **미등원 카카오 안심 알림톡 발송 (`POST /attendance/trigger-unattended-alerts`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **보강(Makeup) 대상자 지정 및 완료 처리 (`PATCH /attendance/:id/makeup`)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **학원 출결 통계 및 요약 분석 (`GET /attendance/stats`)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **출결 기록 삭제 (`DELETE /attendance/:id`)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **알림 목록 조회 (`GET /notifications`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **안 읽은 알림 수 조회 (`GET /notifications/unread-count`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **알림 읽음 처리 (`PATCH /notifications/:id/read`, `PATCH /notifications/read-all`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **알림 삭제 (`DELETE /notifications/:id`)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **알림 재전송 (`POST /notifications/:id/retry`)** | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 📱 3. 1초 출결 체크 & 미등원 감지 자동 알림 흐름

```text
[ 1. 미등원 감지 & 자동 신호 (Unattended Alert) ]
  - 수업 시작 시간(예: 17:00) 경과 후 아직 출결 미입력 학생 감지
  - 학부모 카카오 안심 알림톡 발송 ("김민준 학생이 수업 시작 시각까지 미등원 상태입니다.")
  - 대시보드 및 상단 내비의 '1초 출결 체크' 버튼에 🚨 붉은 펄스 애니메이션(긴급 신호) 활성화
  - 헤더 우측 상단 '종 아이콘(Bell)'에 미확인 알림 뱃지 팝업

[ 2. 출결 체크 완료 시 자동 복귀 ]
  - 선생님이 학생 카드에서 [출석] 또는 [지각] 원터치 터치
  - 출결 DB Upsert 반영과 동시에 해당 학생의 미등원 경고 알림 자동 읽음/해결 처리
  - '1초 출결 체크' 버튼의 펄스 애니메이션이 정지되고 기본 스타일로 즉시 복귀
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

### 4.4. 오늘 미등원 학생 감지 및 경고 상태 조회
* **엔드포인트**: `GET /attendance/unattended-status?date=2026-08-30`
* **Response Body (`UnattendedStatusResponseDto`)**:
  ```json
  {
    "isUnattendedAlertActive": true,
    "unattendedCount": 1,
    "unattendedStudents": [
      {
        "studentId": 1,
        "studentName": "김민준",
        "grade": "중2",
        "parentPhone": "010-1234-5678",
        "classId": 1,
        "className": "중등 수학 심화반",
        "schedule": "월/수/금 17:00-19:00",
        "isAlertSent": true,
        "alertSentAt": "2026-08-30T17:05:00.000Z"
      }
    ]
  }
  ```

### 4.5. 미등원 학생 대상 카카오 안심 알림톡 일괄 발송
* **엔드포인트**: `POST /attendance/trigger-unattended-alerts?date=2026-08-30`
* **Response Body**:
  ```json
  {
    "sentCount": 1,
    "message": "1명의 미등원 학생 학부모님께 카카오 안심 알림톡이 성공적으로 발송되었습니다."
  }
  ```

### 4.6. 알림 목록 조회 & 안 읽은 알림 수 집계
* **엔드포인트**: `GET /notifications?type=UNATTENDED_ALERT&isRead=false&page=1&limit=20`
* **엔드포인트**: `GET /notifications/unread-count`
* **Response Body (`UnreadCountResponseDto`)**:
  ```json
  {
    "unreadCount": 3,
    "unattendedAlertCount": 1,
    "hasUnattendedAlert": true
  }
  ```

### 4.7. 알림 읽음 처리 & 삭제 & 재발송
* `PATCH /notifications/:id/read` : 특정 알림 읽음
* `PATCH /notifications/read-all` : 전체 알림 일괄 읽음
* `DELETE /notifications/:id` : 알림 삭제
* `POST /notifications/:id/retry` : 실패한 카카오 알림톡/SMS 재발송

