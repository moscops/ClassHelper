# 🎓 02. 원생 및 수업 편성 도메인 (Students & Classes Domain)

## 📌 도메인 개요

원생 & 수업 도메인은 **학원의 기본 자산인 원생(학생 및 학부모) 정보, 수업 반(Class) 개설 및 담당 강사 매핑, 그리고 학생의 반 수강 이력(Enrollment)**을 관리하는 핵심 기반 도메인입니다.

---

## 🗄️ 1. 관련 엔티티 (Entities)

### 1) `Student` (원생)
* **역할**: 학원에 등록된 학생 인적사항 및 학부모 비상 연락처 관리.
* **상태 (`StudentStatus`)**:
  * `ACTIVE`: 재원생 (현재 수업을 듣고 있는 정상 재원생)
  * `ON_LEAVE`: 휴원생 (방학/개인 사정으로 잠시 수업을 쉬는 학생)
  * `DISCHARGED`: 퇴원생 (학원을 퇴원한 학생 - 수납/출결 이력은 영구 보존)
* **주요 필드**:
  * `name`: 학생 이름 (필수)
  * `gender`: 성별 (`MALE` | `FEMALE`)
  * `birthDate`: 생년월일 (`YYYY-MM-DD`)
  * `schoolName`, `grade`: 재학 학교 및 학년 (예: `대치중학교`, `중2`)
  * `studentPhone`: 원생 본인 연락처
  * `parentPhone`: 학부모 연락처 (알림톡/문자/수납 청구 수신처 - 필수)
  * `parentName`, `parentRelationship`: 보호자 성함 및 관계 (모, 부, 조모 등)
  * `enrolledAt`: 학원 입원일 (`YYYY-MM-DD`, 기본값 오늘)
  * `dischargedAt`: 퇴원일자
  * `memo`: 학습 성향, 희망 진도 및 특이사항 메모

### 2) `Class` (수업 반)
* **역할**: 과목별, 학년별, 수준별로 개설되는 정규/특강 강의 단위.
* **상태 (`ClassStatus`)**:
  * `ACTIVE`: 정상 운영 중 (수강생 배정 및 출결 체크 가능)
  * `INACTIVE`: 방학/특강 종료 등으로 인한 임시 휴강
  * `CLOSED`: 완전히 종료된 폐강
* **주요 필드**:
  * `name`: 반 이름 (예: "중등 수학 심화A반", "고등 영어 독해 주말반")
  * `subject`: 과목 (수학, 영어, 국어, 과학 등)
  * `targetGrade`: 대상 학년 (중2, 고1 등)
  * `teacherId`: 담당 강사 User ID (FK)
  * `schedule`: 주간 시간표 (예: "월/수/금 17:00-19:00")
  * `capacity`: 정원 (최대 수강 가능 인원, 기본 15명)
  * `monthlyFee`: 월 수강료 (기본 청구 기준 금액)

### 3) `Enrollment` (수강 이력 매핑)
* **역할**: 학생과 수업 반을 기간별로 연결하는 M:N 매핑 엔티티.
* **상태 (`EnrollmentStatus`)**:
  * `ENROLLED`: 현재 수강 중 (출결 및 청구서 생성 대상)
  * `COMPLETED`: 정규 과정 수강 완료 (종강)
  * `DROPPED`: 반 변경 또는 중도 하차 (퇴반)
  * `PAUSED`: 수강 일시 정지

---

## 👥 2. 역할별 권한 매트릭스 (Role Permissions Matrix)

| 기능 / 작업 | SUPER_ADMIN | OWNER | ADMIN | TEACHER | STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **신규 원생 등록 및 프로필 수정** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **원생 퇴원 / 휴원 상태 변경** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **원생 데이터 삭제** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **전체 원생 목록 & 학부모 연락처 조회** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **원생 CSV 일괄 등록 및 템플릿 다운로드** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **신규 수업 반 개설 & 수강료 설정** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **수업 반 담당 강사 배정 및 변경** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **학생 수강 등록 (반 배정 / 퇴반)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **본인 담당 반 학생 명단 조회** | ✅ | ✅ | ✅ | ✅ (본인반) | ✅ |

---

## 🔄 3. 원생 등록 및 반 배정 라이프사이클

```text
[ 1. 원생 신규 등록 (Students Page) ]
       │  (Student: ACTIVE, 보호자 연락처 필수)
       ▼
[ 2. 수업 반 개설 및 강사 배정 (Classes Page) ]
       │  (Class: ACTIVE, 정원 및 월 수강료 설정)
       ▼
[ 3. 스마트 검색 배정 (Enrollment 생성) ]
       │  (실시간 다중 필터링 Autocomplete Combobox)
       │  (Enrollment: ENROLLED, 시작일자 지정)
       ├─────────────────────────────────┐
       ▼                                 ▼
[ 4. 매일 1초 출결 체크 대상 ]    [ 5. 매월 수강료 청구서 자동 생성 ]
       │  (Phase 3-4 예정)               │  (Phase 3-5 예정)
       ▼                                 ▼
[ (퇴반/휴원 시) Enrollment: DROPPED / Student: ON_LEAVE ]
```

---

## 🔌 4. 백엔드 API 명세 (Backend REST Endpoints)

### 📌 원생 관리 API (`/students`)
| HTTP Method | Endpoint | 설명 | 접근 권한 |
| :--- | :--- | :--- | :--- |
| `POST` | `/students` | 신규 원생 등록 | OWNER, ADMIN, TEACHER, STAFF |
| `GET` | `/students` | 원생 목록 검색/필터/페이징 조회 | 전체 인증 사용자 |
| `GET` | `/students/:id` | 원생 상세 정보 및 수강 중인 반 목록 조회 | 전체 인증 사용자 |
| `PATCH` | `/students/:id` | 원생 정보 수정 | OWNER, ADMIN, TEACHER |
| `PATCH` | `/students/:id/status` | 원생 학적 상태 변경 (`ACTIVE`/`ON_LEAVE`/`DISCHARGED`) | OWNER, ADMIN |
| `DELETE` | `/students/:id` | 원생 데이터 영구 삭제 | OWNER, ADMIN |
| `GET` | `/students/bulk-import/template` | CSV 일괄 등록 템플릿 다운로드 | OWNER, ADMIN |
| `POST` | `/students/bulk-import` | 원생 CSV 파일 일괄 등록 (`multipart/form-data`, 필드명 `file`) | OWNER, ADMIN |

#### CSV 일괄 등록 헤더 계약
- **필수 컬럼**: `이름`(또는 `name`), `학부모연락처`(또는 `parentPhone`)
- **선택 컬럼**: `성별`(남/여 또는 MALE/FEMALE), `생년월일`(YYYY-MM-DD), `학교명`, `학년`, `학생연락처`, `학부모이름`, `학부모관계`, `재원상태`(재원/휴원/퇴원 또는 ACTIVE/ON_LEAVE/DISCHARGED), `등록일`(YYYY-MM-DD), `메모`
- **최대 2,000행**, 파일 크기 5MB 제한
- **중복 처리**: 동일 학원 내 (이름, 학부모연락처)가 일치하는 행은 신규 생성하지 않고 건너뜀(`skipped`) — 덮어쓰지 않으므로 같은 파일을 재업로드해도 안전(idempotent)
- **부분 성공**: 검증에 실패한 행은 `failed` 목록에 사유와 함께 기록되고, 나머지 유효한 행은 정상 등록됨 (전체 실패 아님)
- 응답 형식(`BulkImportResultDto`): `totalRows`, `createdCount`, `skippedCount`, `failedCount`, `created[]`, `skipped[]`, `failed[]`

### 📌 수업 반 & 수강생 배정 API (`/classes`)
| HTTP Method | Endpoint | 설명 | 접근 권한 |
| :--- | :--- | :--- | :--- |
| `POST` | `/classes` | 신규 수업 반 개설 | OWNER, ADMIN |
| `GET` | `/classes` | 학원 개설 반 전체 목록 및 수강 인원 집계 조회 | 전체 인증 사용자 |
| `GET` | `/classes/:id` | 특정 반 상세 정보 및 수강생 명단 조회 | 전체 인증 사용자 |
| `PATCH` | `/classes/:id` | 반 정보 및 강사/수강료 수정 | OWNER, ADMIN |
| `DELETE` | `/classes/:id` | 반 삭제 | OWNER, ADMIN |
| `POST` | `/classes/:id/enrollments` | 반에 원생 수강 등록 (Enrollment 생성) | OWNER, ADMIN |
| `GET` | `/classes/:id/enrollments` | 반에 등록된 수강생 목록 및 수강 상태 조회 | 전체 인증 사용자 |
| `PATCH` | `/classes/:id/enrollments/:enrollmentId` | 수강생 상태 변경 (`ENROLLED`/`DROPPED`/`COMPLETED`) | OWNER, ADMIN |

---

## 💻 5. 프론트엔드 UI/UX 구현 사양 (Frontend Specification)

### 1) 통합 레이아웃 및 헤더 동기화
* **전체 페이지 너비 통일**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
* **헤더 탭 네비게이션**: `[대시보드] (/dashboard)`, `[원생 관리] (/students)`, `[반 & 수강생 관리] (/classes)` 간 100% 동일 규격 및 위치 동기화.
* **플랫폼 관리자 포털 복귀 버튼**: `SUPER_ADMIN` 계정 로그인 시 보라색(`bg-purple-600`) `[🛡️ 관리자 포털로 돌아가기]` 버튼 상시 노출.
* **노출 툴팁 제거**: 사용성 개선을 위해 모든 브라우저 네이티브 `title` 툴팁 및 커스텀 오버레이를 배제하여 산만함 제거.
* **비가시 스크롤바**: 전역 스크롤바 숨김 처리(`*::-webkit-scrollbar { display: none; }`, `* { scrollbar-width: none; }`)로 깔끔한 UI 유지.

### 2) 커스텀 플로팅 캘린더 (`CustomDatePicker`)
* **직접 숫자 입력 지원**: `YYYY-MM-DD` 텍스트 박스로 키보드 연속 입력(예: `20260901` 입력 시 자동 하이픈 생성) 및 백스페이스 편집 지원.
* **인라인 플로팅 달력 드롭다운**: 날짜 입력칸 바로 밑에 정밀하게 열리는 세련된 월/일 캘린더 팝업 카드.
* **요일별 색상 및 오늘 날짜 퀵 버튼**: 일요일(로즈), 토요일(인디고), 평일 구분 및 `[오늘]` 날짜 원클릭 설정 버튼.
* **외부 클릭(Click-Outside) 및 ESC 감지**: 달력 바깥 영역 클릭 또는 ESC 입력 시 자동 닫힘.

### 3) 원생 관리 다차원 필터링 (Students Page Multi-Filter)
* **재원 상태 탭**: `전체`, `재원 (ACTIVE)`, `휴원 (ON_LEAVE)`, `퇴원 (DISCHARGED)`
* **학년 구분 칩**: `전체 학년`, `초등`, `중등`, `고등`
* **수업 반별 필터 (`classFilter`)**: `전체 반`, `미배정 원생`, 개설된 개별 반 선택 필터링 지원.
* **수강 중인 반 뱃지 표시**: 원생 목록 테이블에서 학생별 수강 중인 반 목록(`enrolledClasses`)을 시각적 뱃지로 표시.

### 4) 반 & 수강생 관리 다차원 필터링 (Classes Page Multi-Filter)
* **운영 상태 탭**: `전체`, `운영중 (ACTIVE)`, `임시휴강 (INACTIVE)`, `폐강 (CLOSED)`
* **과목별 필터 칩**: `전체 과목`, `수학`, `영어`, `국어`, `과학`, `기타 과목`
* **대상 학년 필터 칩**: `전체 학년`, `초등`, `중등`, `고등`
* **수업 요일/날짜 필터 칩**: `전체 요일`, `월`, `화`, `수`, `목`, `금`, `토`, `일`, `평일반`, `주말반`
* **원클릭 필터 초기화**: 활성화된 다중 조건 검색을 즉시 리셋하는 `[필터 초기화]` 버튼 제공.

### 5) 스마트 검색형 원생 배정 (Autocomplete Combobox)
* **다중 키워드 실시간 필터**: 원생 이름, 학년(예: `중2`), 학교명(예: `대치중`), 학부모/학생 연락처 중 아무 값이나 입력 시 드롭다운에서 실시간 필터링.
* **중복 배정 방지**: 이미 해당 반에 수강 중인 원생은 `[수강중]` 뱃지와 함께 비활성화 처리.
* **원클릭 초기화**: `[X]` 버튼으로 빠른 검색어 초기화 및 재검색 지원.

### 6) 커스텀 폼 유효성 검사 (Custom Form Validation)
* **브라우저 기본 팝업 배제**: `<form noValidate>` 적용.
* **인라인 에러 피드백**: 필수 입력란(이름, 학부모 연락처 등) 누락 시 부드러운 붉은색 테두리(`border-rose-500`) 및 아이콘 에러 메시지 애니메이션 표시, 타이핑 시 자동 해제.

### 7) 전역 커스텀 플로팅 드롭다운 UI 통일 (Unified Custom Floating Dropdowns)
* **브라우저 기본 `<select>` 100% 제거**: 모든 드롭다운 요소를 현대적인 플로팅 팝오버 디자인으로 일원화.
* **시각적 상태 표시**: 상태 색상 인디케이터 도트(초록: 재원/수강중, 파랑: 수료, 주황: 휴원/일시정지, 빨강: 퇴원/중도하차), `ChevronDown` 회전 애니메이션 적용.
* **적용 영역**:
  - 원생 관리 학적 상태 퀵 변경 드롭다운 (`ACTIVE`, `ON_LEAVE`, `DISCHARGED`)
  - 원생 관리 배정 반 필터 드롭다운 (`전체 반`, `미배정`, 개설 반 목록)
  - 원생 등록/수정 모달: 성별 세그먼트 버튼 그룹 (`미지정`, `남`, `여`) 및 보호자 관계 커스텀 드롭다운 (`모`, `부`, `조모`, `조부`, `기타`)
  - 수강생 배정 관리 수강 상태 드롭다운 (`ENROLLED`, `COMPLETED`, `PAUSED`, `DROPPED`)
* **외부 클릭(Click-Outside) 및 ESC 인터랙션**: 드롭다운 바깥 영역 클릭 또는 `ESC` 키 입력 시 열려있는 드롭다운 즉시 자동 닫힘.
* **최상위 레이어 보장 (Stacking Context & `z-[60]` 최적화)**: 테이블 및 모달 내부에서 드롭다운이 열릴 때 활성화된 행/컨테이너에 `relative z-50`을 부여하고 팝오버를 `z-[60]`으로 지정하여 다음 행이나 다른 카드 뒤로 가려지는 현상을 100% 방지.
* **하향 기본 배치 및 화면 경계 기반 지능형 팝오버 (Downward-Default Viewport Positioning)**: 드롭다운 메뉴는 **기본적으로 항상 버튼 아래(`top-full mt-1.5`)에 열리도록 배치**되며, 브라우저 화면 맨 하단에 위치하여 아래 공간이 부족할 때(`spaceBelow < 170px`)에만 위쪽(`bottom-full mb-1.5`)으로 유연하게 열리도록 실시간 뷰포트 좌표 계산을 적용.



