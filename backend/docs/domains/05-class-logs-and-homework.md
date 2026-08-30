# 📖 05. 수업 일지 및 과제 관리 도메인 (Class Logs & Homework Domain)

## 📌 도메인 개요

수업 일지 & 과제 도메인은 **강사가 매 수업 회차별로 나간 교재 진도와 수업 내용, 과제(숙제)를 기록하고, 학생별 과제 제출/완성도 및 피드백을 축적하여 학부모 상담 및 학업 성취도 관리의 근거 데이터로 활용**하는 교육 본질 도메인입니다.

---

## 🗄️ 1. 관련 엔티티 (Entities)

### 1) `ClassLog` (수업 일지)
* **역할**: 각 반의 회차별 수업 내용 및 과제 공지 기록.
* **주요 필드**:
  * `id`: 일지 고유 ID (`Int`, PK)
  * `academyId`: 소속 학원 ID (멀티테넌시 격리)
  * `classId`: 해당 수업 반 ID (FK)
  * `teacherId`: 수업을 진행한 강사 User ID (FK)
  * `date`: 수업 진행 일자 (`YYYY-MM-DD`, `@db.Date`)
  * `curriculum`: 교재 및 진도 범위 (예: "개념원리 수학(상) p.45~62 다항식의 연산")
  * `lessonContent`: 당일 수업 핵심 내용 요약
  * `homework`: 당일 부여한 과제 내용 (예: "워크북 p.20~24 짝수번 풀기")
  * `notes`: 수업 중 특이사항 (예: "오늘 모의고사 풀이로 진도 1단원 지연됨")
* **인덱스**:
  * `@@index([academyId, date])`, `@@index([classId, date])`, `@@index([teacherId, date])`

### 2) `HomeworkSubmission` (원생별 과제 제출 및 평가)
* **역할**: 수업 일지(`ClassLog`)에 연결된 반 학생들의 개별 숙제 검사 결과.
* **과제 완성 상태 (`HomeworkStatus`)**:
  * `COMPLETED`: 완료 (숙제 정상 완료)
  * `INCOMPLETE`: 미흡 (일부 미완료 / 재제출 필요)
  * `NOT_SUBMITTED`: 미제출 (숙제를 해오지 않음)
  * `EXCUSED`: 면제 (병원 진료, 결석 등으로 인한 과제 면제)
* **주요 필드**:
  * `id`: 고유 ID (`Int`, PK)
  * `classLogId`: 연결된 수업 일지 ID (FK)
  * `studentId`: 대상 수강생 ID (FK)
  * `status`: 과제 완성도 (`HomeworkStatus`, 기본값 `NOT_SUBMITTED`)
  * `score`: 과제 채점 점수 (선택, 0~100점)
  * `feedback`: 강사의 개별 학생 맞춤 코멘트 (예: "오답 노트 정리가 아주 훌륭함")
* **유니크 제약 & 인덱스**:
  * `@@unique([classLogId, studentId])`: 동일 수업 일지에 학생당 1개의 과제 레코드 보장 (Upsert 지원)
  * `@@index([studentId])`

---

## 👥 2. 역할별 권한 매트릭스 (Role Permissions Matrix)

| 기능 / 작업 | SUPER_ADMIN | OWNER | ADMIN | TEACHER | STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **수업 일지 신규 작성 (`POST /class-logs`)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **수업 일지 목록/상세 조회 (`GET /class-logs`, `GET /class-logs/:id`)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **수업 일지 수정/삭제 (`PATCH /class-logs/:id`, `DELETE /class-logs/:id`)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **원생별 과제 검사 & 피드백 일괄 저장 (`PATCH /class-logs/:id/homework-submissions`)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **원생 누적 과제 이력 리포트 열람 (`GET /class-logs/student/:id/history`)** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔄 3. 수업 일지 & 과제 피드백 라이프사이클

```text
[ 1. 강사: 수업 종료 후 일지 작성 ]
       │  (교재 진도: p.45~62, 숙제: 워크북 p.20~24)
       ▼
[ 2. 학생별 과제 검사 & 상태 체크 ]
       │
       ├── 김민준: COMPLETED (100점) ──> "개념 이해도가 높고 풀이과정 우수"
       ├── 이서연: INCOMPLETE (70점)  ──> "3번, 5번 유형 추가 보강 필요"
       └── 박도현: NOT_SUBMITTED    ──> "금요일 수업 전까지 제출 요망"
       ▼
[ 3. 학부모 정기 학습 상담 및 성취도 리포트로 자동 활용 ]
```

---

## 📡 4. RESTful API 명세 (API Specifications)

### 4.1. 수업 일지 신규 작성
* **엔드포인트**: `POST /class-logs`
* **Request Body (`CreateClassLogDto`)**:
  ```json
  {
    "classId": 1,
    "date": "2026-08-30",
    "curriculum": "개념원리 수학(상) p.45~62 다항식의 연산",
    "lessonContent": "다항식의 곱셈 공식 1~5번 암기 및 예제 풀이 진행",
    "homework": "워크북 p.20~24 짝수번 풀기 및 오답노트 작성",
    "notes": "전원 집중도 양호. 다음 시간 쪽지시험 예정"
  }
  ```
* **동작 특성**: 수업 일지 생성 시, 해당 반의 모든 활성 수강생(`EnrollmentStatus.ENROLLED`)을 대상으로 `HomeworkSubmission` 레코드를 `NOT_SUBMITTED` 기본값으로 자동 일괄 생성합니다.

### 4.2. 수업 일지 목록 조회 (필터 & 페이징)
* **엔드포인트**: `GET /class-logs?classId=1&startDate=2026-08-01&endDate=2026-08-31&search=다항식&page=1&limit=20`
* **Response Body (`PaginatedClassLogsResponseDto`)**:
  ```json
  {
    "items": [
      {
        "id": 1,
        "academyId": 1,
        "classId": 1,
        "teacherId": 2,
        "date": "2026-08-30",
        "curriculum": "개념원리 수학(상) p.45~62 다항식의 연산",
        "lessonContent": "다항식의 곱셈 공식 1~5번 암기 및 예제 풀이",
        "homework": "워크북 p.20~24 짝수번 풀기",
        "notes": "전원 집중도 양호",
        "class": {
          "id": 1,
          "name": "중등 수학 심화반",
          "subject": "수학",
          "schedule": "월/수/금 17:00-19:00"
        },
        "teacher": {
          "id": 2,
          "name": "홍길동 강사",
          "email": "teacher@classhelper.com"
        },
        "totalStudents": 10,
        "completedCount": 8,
        "incompleteCount": 1,
        "notSubmittedCount": 1,
        "excusedCount": 0,
        "completionRate": 80.0,
        "averageScore": 92.5
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```

### 4.3. 학생별 과제 검사 결과 & 피드백 일괄 수정
* **엔드포인트**: `PATCH /class-logs/:id/homework-submissions`
* **Request Body (`BatchUpdateHomeworkSubmissionsDto`)**:
  ```json
  {
    "submissions": [
      {
        "studentId": 1,
        "status": "COMPLETED",
        "score": 100,
        "feedback": "오답노트 정리가 매우 깔끔하고 우수함"
      },
      {
        "studentId": 2,
        "status": "INCOMPLETE",
        "score": 70,
        "feedback": "서술형 3번 유형 보강 풀이 필요"
      }
    ]
  }
  ```

### 4.4. 특정 원생의 누적 과제 이력 리포트 조회
* **엔드포인트**: `GET /class-logs/student/:studentId/history`
* **Response Body (`StudentHomeworkHistoryResponseDto`)**:
  ```json
  {
    "studentId": 1,
    "studentName": "김민준",
    "totalAssignments": 15,
    "completedAssignments": 13,
    "completionRate": 86.7,
    "averageScore": 94.2,
    "history": [
      {
        "id": 1,
        "classLogId": 1,
        "date": "2026-08-30",
        "className": "중등 수학 심화반",
        "teacherName": "홍길동 강사",
        "curriculum": "개념원리 수학(상) p.45~62",
        "homework": "워크북 p.20~24",
        "status": "COMPLETED",
        "score": 100,
        "feedback": "개념 이해도가 높고 풀이과정 우수"
      }
    ]
  }
  ```

---

## 🎨 5. UI/UX 구현 명세 (프론트엔드 화면)

### 5.1. 수업 일지 대시보드 및 피드 (`/class-logs`)
1. **상단 핵심 KPI 카드**: 이번 달 총 작성 일지 수, 평균 과제 완료율(%), 평균 과제 점수, 점검 대상 학생 수 집계.
2. **다차원 필터 바**: 수업 반 선택 드롭다운, 시작일/종료일 DatePicker, 실시간 키워드 검색(교재명, 단원, 숙제 내용).
3. **타임라인 일지 카드**:
   - 일자 뱃지, 반 이름, 담당 강사명.
   - 교재 및 진도 범위 하이라이트 배너.
   - 수업 핵심 내용 요약 및 숙제 공지 블록.
   - 과제 완료율 프로그레스 바 & 세부 현황(`완료 N / 미흡 N / 미제출 N / 평균 점수`).
4. **원생별 1초 과제 검사 체크보드 (아코디언)**:
   - 각 일지 카드의 `[원생별 과제 검사]` 버튼을 눌러 펼침/접기 가능.
   - 1초 원터치 상태 토글: `[✓ 완료 (100점)]`, `[⚠️ 미흡]`, `[✕ 미제출]`, `[🛡️ 면제]`.
   - 점수 입력 및 개별 맞춤 코멘트 입력 후 `[과제 검사 저장]` 원터치 반영.
5. **학부모 상담용 누적 리포트 모달 (`StudentHomeworkReportModal`)**:
   - 원생 이름 옆 `[누적 리포트]` 클릭 시 과거 모든 수업 회차별 과제 수행률, 평균 점수, 교재별 강사 피드백 히스토리를 모달로 즉시 열람.
