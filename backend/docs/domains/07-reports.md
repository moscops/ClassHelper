# 📊 07. 원생 리포트 도메인 (Reports Domain)

## 📌 도메인 개요

리포트 도메인은 **지정한 기간(주간/월간 등, 호출자가 직접 지정)의 원생 출결·과제 수행 현황을 집계하여 학부모에게 카카오 알림톡으로 발송**합니다. 별도의 Prisma 모델을 갖지 않는 **오케스트레이션 도메인**으로, `attendance`(출결 통계)와 `class-logs`(과제 통계)의 기존 로직을 재사용하고, 실제 발송은 `notifications` 도메인의 기존 `KAKAO` 채널을 그대로 사용합니다.

---

## 🗄️ 1. 관련 엔티티 (Entities)

이 도메인은 자체 모델이 없으며, 기존 모델을 조합합니다.
* **`Attendance`** (`attendance` 도메인): 기간 내 출석/지각/결석/조퇴 집계.
* **`HomeworkSubmission`** (`class-logs` 도메인): 기간 내 과제 완료율/평균 점수 집계.
* **`Notification`** (`notifications` 도메인): 리포트 발송 이력 — 신규 `NotificationType.STUDENT_REPORT` 값으로 구분.

---

## 👥 2. 역할별 권한 매트릭스 (Role Permissions Matrix)

| 기능 / API | SUPER_ADMIN | OWNER | ADMIN | TEACHER | STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **리포트 미리보기 조회** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **원생 리포트 발송** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **반 전체 리포트 일괄 발송** | ✅ | ✅ | ✅ | ✅ | ❌ |

`class-logs`(수업 일지/과제)의 쓰기 권한과 동일하게 `STAFF`는 제외됩니다 — 학부모에게 전달되는 학업 관련 콘텐츠이기 때문입니다.

---

## 🔄 3. 리포트 생성/발송 흐름

```text
[ 1. 기간 지정 (periodStart, periodEnd — 주간/월간 어떤 것이든 호출자가 결정) ]
       ▼
[ 2. AttendanceService.getStudentAttendanceStats() ]  ┐
[ 3. ClassLogsService.getStudentHomeworkStats() ]      ├─ 병렬 조회
       ▼                                               ┘
[ 4. 메시지 본문 조합 (출결 현황 + 과제 수행 현황) ]
       ▼
[ 5. NotificationsService.createNotification(channel: KAKAO, type: STUDENT_REPORT) ]
       ▼
[ 6. Notification 레코드 저장 (실제 카카오 API 연동은 다른 도메인과 동일하게 시뮬레이션 — 로그 기록) ]
```

반 전체 발송(`POST /reports/classes/:id/send`)은 위 흐름을 재원생(`ENROLLED`) 전원에 대해 반복하며, 원생 1명의 실패가 나머지 발송을 막지 않습니다(부분 성공 — `bulk-import` 도메인과 동일한 철학).

---

## 📡 4. RESTful API 명세 (API Specifications)

> 구현 위치: `backend/src/reports/` (`reports.controller.ts`, `reports.service.ts`). 모든 엔드포인트는 `JwtAuthGuard` + `RolesGuard`로 보호되며, `@CurrentUser('academyId')`로 테넌시가 강제됩니다.

### 4.1. 원생 리포트 미리보기
* **엔드포인트**: `GET /reports/students/:id?periodStart=2026-09-01&periodEnd=2026-09-30`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`, `TEACHER`
* **Response Body (`StudentReportDto`)**:
  ```json
  {
    "studentId": 1,
    "studentName": "김민준",
    "periodStart": "2026-09-01",
    "periodEnd": "2026-09-30",
    "attendance": { "totalDays": 20, "presentCount": 18, "absentCount": 1, "lateCount": 1, "earlyLeaveCount": 0, "attendanceRate": 90.0 },
    "homework": { "totalAssignments": 10, "completedAssignments": 8, "completionRate": 80.0, "averageScore": 92.5 },
    "message": "[김민준 학생 리포트]\n📅 기간: 2026-09-01 ~ 2026-09-30\n\n✅ 출결 현황\n..."
  }
  ```
* **동작 특성**: DB에 아무 것도 기록하지 않는 순수 조회입니다 — 발송 전 내용을 확인하는 용도.

### 4.2. 원생 리포트 생성 및 카카오 발송
* **엔드포인트**: `POST /reports/students/:id/send`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`, `TEACHER`
* **Request Body (`GenerateReportDto`)**:
  ```json
  { "periodStart": "2026-09-01", "periodEnd": "2026-09-30" }
  ```
* **Response Body (`SendReportResultDto`)**: `StudentReportDto` + `{ "sentTo": "010-1234-5678", "notificationId": 101 }`
* **동작 특성**: `Notification` 레코드를 `type: STUDENT_REPORT`, `channel: KAKAO`로 생성합니다. 실제 카카오 API 연동은 아직 없으며(이 저장소의 다른 모든 카카오 발송과 동일), 로그 기록 + DB 저장까지가 "발송"의 전부입니다.

### 4.3. 반 전체 원생 리포트 일괄 발송
* **엔드포인트**: `POST /reports/classes/:id/send`
* **권한**: `SUPER_ADMIN`, `OWNER`, `ADMIN`, `TEACHER`
* **Request Body (`GenerateReportDto`)**: 4.2와 동일
* **Response Body (`ClassReportSendResultDto`)**:
  ```json
  {
    "classId": 3,
    "className": "중등 수학 심화반",
    "periodStart": "2026-09-01",
    "periodEnd": "2026-09-30",
    "totalStudents": 12,
    "sentCount": 11,
    "failedCount": 1,
    "results": [ "SendReportResultDto[]" ],
    "failed": [ { "studentId": 5, "studentName": "이서연", "reason": "..." } ]
  }
  ```
* **동작 특성**: 반에 재원(`ENROLLED`) 중인 원생 전원을 대상으로 4.2를 반복 호출합니다. 개별 원생 발송 실패는 `failed[]`에 기록되고 나머지 원생 발송을 막지 않습니다(전체 실패 아님).

**미구현 (범위 밖, 후속 작업)**: 이메일 발송, 자동 스케줄링(매주/매월 자동 발송 — 이 백엔드에는 아직 `@nestjs/schedule`/cron이 전혀 없습니다). 현재는 수동 발송만 지원합니다.
