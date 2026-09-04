# 🤝 AI Handoff & Synchronization Log (AI_HANDOFF.md)

> 📌 **사용 목적**: 백엔드 전담 **Claude**와 프론트엔드 전담 **Gemini** 간의 비동기 협업 및 변경 사항 동기화 문서입니다.
> - **Claude (Backend)**: 백엔드 API 신규 생성, DTO 변경, DB 스키마 수정, 비즈니스 로직 업데이트 시 아래에 변경 사항과 프론트엔드 연동 가이드를 기록합니다.
> - **Gemini (Frontend)**: 이 파일의 최신 백엔드 변경 내역을 읽고, 프론트엔드 API 클라이언트(`src/lib/*-service.ts`) 및 UI 컴포넌트(`src/app/*`)를 즉시 업데이트한 뒤 빌드 검증 및 Git 커밋/푸시를 완료하고 상태를 갱신합니다.

---

## 🔄 최근 동기화 히스토리 (최신순)

### 📅 2026-09-04: 9/3 첫 배포 피드백 기반 요구사항 정리 & 백엔드(Claude) 개발 요청 사항 공유
- **작성자**: Gemini (Frontend)
- **배경**: 9/3 첫 배포 이후 사용자 실사용 테스트에서 도출된 21개 피드백 및 요구사항을 분석하여 프론트엔드/백엔드 역할 분담 및 협업 스펙을 공유합니다.

#### 📌 프론트엔드(Gemini) 단독 진행 작업 (즉시 착수)
1. **[버그 수정] 시스템 통신 장애 알림 지속 노출 해결 (`useSystemAlertStore`)**:
   - `localStorage` 영속화 해제 및 세션 단위 상태로 전환, 정상 200 OK 응답 시 자동 클리어 로직 탑재
2. **[버그 수정] 출결 체크 날짜 변경 시 "미등원 감지 경고" 오작동 가드 (`attendance/page.tsx`)**:
   - `selectedDate === today` 조건일 때만 오늘 미등원 경고 배너 및 카카오 발송 활성화 (과거/미래 날짜 조회 시 배너 숨김)
3. **[데이터 정리] 교직원 관리(`/staff`) 내 하드코딩 더미 데이터 완전 삭제 (`staff-service.ts`)**:
   - 기존 UI 목업용 `sampleStaff` 배열(이서연, 김도현 등) 완전 제거, 실제 로그인 유저 및 DB 데이터만 표시
4. **[UI/UX 개선] 신규 반 개설 시 수강생 다중 선택(체크박스 Combobox) 지원 (`classes/page.tsx`)**:
   - 학생을 1명씩 추가하던 번거로움을 해결하기 위해 다중 체크박스 + 검색 + 일괄 추가 인터랙션 구현
5. **[기능 개선] 원생 CSV 템플릿 다운로드 시 올바른 작성 예시 행 탑재 (`students/page.tsx`)**:
   - 헤더 밑에 올바른 포맷(남/여, 재원/휴원/퇴원 등)의 예시 행을 포함하여 다운로드되도록 개선
6. **[기능 개선] 스마트 캘린더 기본 뷰: '오늘의 브리핑(Today)' 탭 신설 (`calendar/page.tsx`)**:
   - 오늘 진행 수업, 등원 예정 학생, 학원 일정/특이사항을 요약 제공하는 일일 집중 뷰 추가
7. **[기능 개선] 대시보드 위젯 커스터마이징 (`dashboard/page.tsx`)**:
   - 위젯 On/Off 및 배치 개인화 설정 기능 (브라우저 저장)
8. **[기능 개선] 리포트 관리 개인별 리포트 임시 저장 및 템플릿 복사 발송 (`reports/page.tsx`)**:
   - 자주 쓰는 문구를 템플릿으로 저장하고 원생 이름만 바꿔 발송할 수 있는 로컬 프리셋 기능 탑재
9. **[보안/인가] 역할(Role: OWNER, ADMIN, TEACHER, STAFF)별 메뉴 가시성 및 접근 차단 강화**:
   - 조교(STAFF) 및 일반 강사(TEACHER)에게 수강료/매출, 교직원 관리, 플랫폼 관리 등 민감 메뉴 숨김 및 URL 접근 차단

---

#### 📌 백엔드(Claude) 개발 요청 사항 (우선순위별 상세)

1. **[P1] 관리자 및 데모 시드 데이터 보강 (`backend/prisma/seed.ts`)**:
   - **요구사항**: 배포 환경 및 로컬 테스트에서 슈퍼 관리자(`SUPER_ADMIN`) 및 기본 학원 원장(`OWNER`) 계정으로 즉시 로그인할 수 있도록 seed 스크립트 작성/보강 요청
   - **예시 계정**: `admin@classhelper.kr` (SUPER_ADMIN), `owner@classhelper.kr` (OWNER)

2. **[P2] 교직원 관리 API 4종 구현 (`auth` 또는 `staff` 도메인)**:
   - **요구사항**: 프론트 `/staff` 페이지가 현재 mock/로컬 병합으로 동작 중입니다. 실 DB 연동을 위해 다음 API 구현을 요청드립니다:
     - `GET /auth/staff` (또는 `GET /staff`): 소속 학원(`academyId`) 교직원 목록 조회 (담당 반 `taughtClasses` include) - `OWNER`, `ADMIN`
     - `PATCH /auth/staff/:id`: 교직원 정보(이름, 연락처, 직책) 수정 - `OWNER`, `ADMIN` (원장 직책 변경 불가)
     - `PATCH /auth/staff/:id/password`: 교직원 비밀번호 초기화 - `OWNER`, `ADMIN`
     - `DELETE /auth/staff/:id`: 교직원 삭제/퇴사 처리 (담당 반 `teacherId` SetNull) - `OWNER`

3. **[P2] 학원 코드 기반 직원 회원가입 및 원장 승인 체계**:
   - **요구사항**: 원장이 직원을 직접 등록하는 것 외에, 직원이 학원 코드로 가입하고 원장이 승인하는 플로우
   - **필요 스펙**:
     - `Academy` 모델 또는 유틸: 고유 학원 코드 (`academyCode`, 예: `CH-8821`)
     - `User.status`: `PENDING_APPROVAL` (승인 대기), `ACTIVE` (정상)
     - `POST /auth/register-staff-by-code`: `{ email, password, name, phone, academyCode, role }` -> `PENDING_APPROVAL` 상태로 생성
     - `PATCH /auth/staff/:id/approve`: 원장 승인 -> `ACTIVE` 전환 및 사용 가능 알림

4. **[P3] 학원 내부 공지사항(Notice) 및 교직원 메모(Memo) 도메인**:
   - **요구사항**: 학원 운영 공지(Notice)와 직원 간 일정/특이사항 정보 교류용 메모(Memo) 분리 구축
   - **`Notice` (공지사항)**:
     - 모델: `id, academyId, title, content, authorId, isPinned, targetRole(ALL/TEACHER/STAFF), createdAt`
     - 권한: `OWNER/ADMIN` 작성/수정/삭제, 전 교직원 조회
     - API: `GET /notices`, `POST /notices`, `PATCH /notices/:id`, `DELETE /notices/:id`
   - **`StaffMemo` (교직원 메모 / 특이사항)**:
     - 모델: `id, academyId, authorId, targetDate, content, isShared(개인/공유), createdAt`
     - 용도: 캘린더 및 대시보드에 일일 특이사항(학생 컨디션, 보강 메모, 업무 인수인계) 기록
     - API: `GET /memos?date=`, `POST /memos`, `PATCH /memos/:id`, `DELETE /memos/:id`

5. **[P3] 반 수강생 일괄 배정 벌크 API (`classes` 도메인)**:
   - **요구사항**: 신규 반 개설 및 기존 반에서 다수의 수강생을 한 번에 배정할 수 있는 벌크 엔드포인트
   - **API**: `POST /classes/:id/enrollments/bulk`
   - **Body**: `{ studentIds: number[] }` (트랜잭션으로 일괄 생성, 중복 자동 스킵)

6. **[P4] 아이디 / 비밀번호 찾기 (`auth` 도메인)**:
   - **요구사항**: 이메일 SMTP 또는 SMS 인증 기반 계정 찾기
   - **API**:
     - `POST /auth/find-email`: `{ name, phone }` -> 마스킹된 이메일 반환
     - `POST /auth/forgot-password`: `{ email }` -> 비밀번호 재설정 토큰/링크 발송
     - `POST /auth/reset-password`: `{ resetToken, newPassword }` -> 비밀번호 변경

---

#### 📌 기획 및 정책 합의 사항
- **학부모 웹 로그인 권한**: 웹 로그인은 제공하지 않고, 기존 카카오 알림톡/SMS를 통한 단방향 알림 및 웹 뷰어 링크 수신 정책을 유지합니다.
- **수강료 청구/수납 도메인**: 현재 안정적으로 구현된 버전을 유지하며, 추가 확장은 후순위로 보류합니다.

---

### 📅 2026-09-02: Docker/EC2 배포 인프라 구축 (Dockerfile, docker-compose.prod.yml, 배포 가이드)
- **작성자**: Claude (Backend, 인프라 작업이라 프론트엔드 파일도 일부 포함)
- **신규 파일**:
  - `backend/Dockerfile`, `backend/.dockerignore`, `backend/.env.production.example`
  - `frontend/Dockerfile`, `frontend/.dockerignore`
  - `docker-compose.prod.yml` (루트) — postgres/backend/frontend 3-서비스 프로덕션 스택
  - `DEPLOYMENT.md` (루트) — EC2 배포 단계별 가이드
- **프론트엔드 관련 변경 (Gemini가 알아야 할 부분)**:
  - `frontend/next.config.ts`에 `output: "standalone"` 추가 — Docker 최소 이미지를 위한 Next.js
    표준 설정. 로컬 `next dev`/`next build` 동작에는 영향 없음.
  - `NEXT_PUBLIC_API_URL`은 이제 **Docker 이미지 빌드 시점에 build-arg로 고정**됩니다(런타임에
    못 바꿈) — 프론트에 새 `NEXT_PUBLIC_*` 환경변수를 추가하게 되면 `frontend/Dockerfile`의
    `ARG`/`ENV` 목록에도 같이 추가해야 프로덕션 빌드에 반영됩니다.
  - `backend/package.json`에 `prisma:migrate:deploy` 스크립트 추가(프로덕션용, `prisma migrate dev`와
    다름 — 논인터랙티브, pending 마이그레이션만 적용).
- **상태**: 로컬 `docker compose config` 문법 검증 완료, 백엔드 테스트 109/109 통과. 실제 EC2 배포는
  아직 미실행(AWS 콘솔/EC2 접근이 필요한 단계라 사용자가 직접 진행, `DEPLOYMENT.md` 참고).

### 📅 2026-09-02: 원장님/관리자 전용 교직원(Staff) 관리 전용 페이지(/staff) 신규 구축 및 네비게이션 연동 완료
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - **1. 교직원 관리 전용 페이지 (`frontend/src/app/staff/page.tsx`) 신규 구축**:
    - **상단 통계 카드 4종**: 전체 교직원 수(Total Staff), 개설 반 매핑 현황(담당 반 배정), 강사진/조교 직책 구성 비중, 계정 보안 & RTR 이중 암호화 상태 100% 정상 가동
    - **실시간 검색 & 필터링 툴바**: 이름/이메일/연락처/담당반 실시간 검색 + 직책별(`ALL`, `OWNER`, `ADMIN`, `TEACHER`, `STAFF`) 필터 드롭다운 + 카드 그리드(`GRID`) / 목록 테이블(`TABLE`) 뷰 모드 토글
    - **카드 그리드 & 테이블 뷰**: 프로필 아바타(직책별 컬러 링), 직책 뱃지, 로그인 이메일(원클릭 복사), 연락처(전화걸기 링크), 등록일자, 담당 수업 반 뱃지 태그
    - **대화형 모달 5종 완벽 구현 (표준 Header/Body/Footer + safe focus ring 적용)**:
      - ➕ **신규 교직원 등록 모달 (`isCreateModalOpen`)**: 직책 선택(`CustomDropdown`), 이름, 이메일, 초기 비밀번호, 연락처 및 직책별 RBAC 권한 안내 가이드
      - ✏️ **교직원 정보 수정 모달 (`isEditModalOpen`)**: 직책(원장은 보호), 이름, 연락처 수정
      - 🔑 **비밀번호 초기화 모달 (`isPasswordModalOpen`)**: 원장님이 강사/직원의 비밀번호를 즉시 재설정
      - 🗑️ **퇴사 / 삭제 확인 모달 (`isDeleteModalOpen`)**: 담당 반 배정 해제 경고 및 안전한 삭제 확인
      - 📚 **담당 수업 반 목록 모달 (`isClassModalOpen`)**: 강사의 배정된 반 목록, 정원/수강생 수, 시간표 확인 및 반 관리 바로가기
  - **2. 교직원 서비스 클라이언트 (`frontend/src/lib/staff-service.ts`, `frontend/src/types/staff.ts`) 구현**:
    - `getStaffList()`, `createStaff()`, `updateStaff()`, `resetStaffPassword()`, `deleteStaff()`, `calculateStats()` 구현
    - 백엔드 `POST /auth/register-staff` 연동 및 `GET/PATCH/DELETE` 백엔드 배포 대기 시 수업 반 강사 데이터 & 로컬 스토리지와 자동 병합되는 폴백 로직 탑재
  - **3. 전역 네비게이션 & 대시보드 연동**:
    - `AppNavbar.tsx`: `OWNER`, `ADMIN`, `SUPER_ADMIN`에게 상단 및 모바일 네비게이션에 **`교직원 관리` (`/staff`)** 메뉴 표시
    - `AppLayout.tsx`: 사이드바 '알림 & 운영' 그룹에 **`교직원 관리` (`/staff`)** 추가
    - `dashboard/page.tsx`: 핵심 학원 관리 도메인 7대 그리드에 **`교직원 관리`** 바로가기 카드 배치
- **백엔드 연동 요청 사항 (Claude에게 전달)**:
  - 현재 백엔드에는 `POST /auth/register-staff`가 구현되어 있습니다.
  - 추가로 원장님/관리자 전용 교직원 관리 API 4종 구현을 요청드립니다:
    1. `GET /auth/staff` (또는 `GET /staff`): 소속 학원(`academyId`) 전체 교직원 목록 조회 (담당 반 `taughtClasses` include) - `OWNER`, `ADMIN` 전용
    2. `PATCH /auth/staff/:id`: 교직원 정보(이름, 연락처, 직책) 수정 - `OWNER`, `ADMIN` 전용 (원장 직책 변경 불가)
    3. `PATCH /auth/staff/:id/password`: 교직원 비밀번호 초기화/재설정 - `OWNER`, `ADMIN` 전용
    4. `DELETE /auth/staff/:id`: 교직원 삭제/퇴사 처리 (담당 반 `teacherId` SetNull) - `OWNER` 전용
- **상태**: ✅ Next.js 16 프로덕션 빌드 (18/18 routes) 완벽 통과, 프론트엔드 연동 완료

### 📅 2026-09-02: 수강료 청구 대상 반 드롭다운 스크롤 개선 및 모달(Header/Body/Footer) 구조 전면 표준화 완료
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - **1. 수강료 모달(`tuition/page.tsx`) 스크롤 불능 및 드롭다운 잘림 완벽 해결**:
    - 기존 모달 전체 `overflow-hidden`으로 인해 `CustomDropdown` 목록이 모달 바닥 밖으로 넘칠 때 잘리거나 스크롤이 불가했던 문제를 해결
    - 청구서 일괄 생성, 수납 처리, 청구서 수정, 수납 영수증 내역 4개 모달 모두 고정 Header(`shrink-0 border-b`) + 스크롤 가능한 Form Body(`flex-1 overflow-y-auto px-5 py-4 min-h-0`) + 고정 Footer(`shrink-0 border-t bg-slate-50/60`) 구조로 전면 표준화
  - **2. `CustomDropdown` 스마트 방향 판별 및 내부 스크롤 격리(`overscroll-contain`) 지원**:
    - `direction?: 'auto' | 'up' | 'down'` 프로퍼티 추가 및 바닥 여백 임계값(`280px`)을 상향하여 공간 부족 시 위로 자동 펼침
    - 드롭다운 팝오버에 `overscroll-contain touch-pan-y` 및 `max-h-60`을 적용하여 드롭다운 리스트 내부에서 마우스 휠이나 터치 스크롤 시 부모 모달과 충돌 없이 드롭다운 아이템만 매끄럽게 스크롤되도록 개선
    - `isOpen` 시 `z-[60]` / 팝오버 `z-[80]`으로 모달 내부 레이어 간섭 완벽 차단
  - **3. 수업 일지(`class-logs/page.tsx`) 및 캘린더(`calendar/page.tsx`) 모달 구조 일괄 최적화**:
    - 수업 일지 작성/수정 모달 및 일정 등록/수정 모달 또한 동일한 Header / Scrollable Body / Footer 구조로 통일하여 드롭다운 및 폼 요소들의 스크롤과 포커스가 쾌적하게 동작하도록 일원화
- **상태**: ✅ Next.js 16 프로덕션 빌드 (17/17 routes) 완벽 통과 (11.87s)

### 📅 2026-09-02: 전 페이지 모달 폼 안전 패딩 및 모든 입력창(input / textarea) 패딩/포커스 링 스타일 표준화 완료
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - **1. 모달 폼 스크롤 컨테이너 안전 여백 (`px-1.5 py-1`) 전면 일괄 적용**:
    - `overflow-y-auto` 스크롤 박스 내부에서 자식 엘리먼트 포커스 시 외곽 포커스 링(`focus:ring`)이 좌측이나 상하단 경계에 의해 잘리거나 텍스트가 가려지는 현상을 모든 모달에서 원천 방지
  - **2. 모든 검색창 및 입력 필드 포커스 스타일 전수 통일**:
    - **검색창**: `pl-9.5 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`
    - **일반 인풋 & 일자/시간 인풋**: `px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`
    - **텍스트에어리어**: `px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none`
    - **적용 대상 페이지 전수 완료**:
      - 원생 관리 (`/students`), 반 관리 (`/classes`), 1초 출결 (`/attendance`), 수강료/수납 (`/tuition`), 리포트 관리 (`/reports`), 캘린더 (`/calendar`), 대시보드 (`/dashboard`), 알림 센터 (`/notifications`), 플랫폼 관리 (`/admin`), 로그인 (`/login`), 회원가입 (`/register`)
- **상태**: ✅ Next.js 16 프로덕션 빌드 (17/17 routes) 완벽 통과, Jest 109/109 PASS 검증 완료

### 📅 2026-09-02: 새 수업 일지 작성 모달 폼 입력창 포커스 시 좌측 가림 현상 완벽 해결
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - **1. 모달 폼 컨테이너 안전 여백 확보 (`class-logs/page.tsx`)**:
    - `form` 스크롤 영역에 `px-1.5 py-1`의 안전 패딩을 제공하여 `overflow-y-auto` 컨테이너 내부에서 포커스 링(`focus:ring`)이 좌측 틀에 잘리거나 가려지는 현상 완벽 해소
  - **2. 입력 필드 포커스 링 & 패딩 최적화 (`class-logs/page.tsx`)**:
    - 모든 `input` 및 `textarea`의 좌측 내부 패딩을 `px-4`로 확장하고, `focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`을 적용하여 포커스 시 텍스트 및 테두리가 가림 없이 깔끔하게 렌더링되도록 개선
- **상태**: ✅ Next.js 16 프로덕션 빌드 (17/17 routes) 완벽 통과, Jest 109/109 PASS 검증 완료

### 📅 2026-09-02: 반별 출결 체크 화면 전원 출석 일괄 처리 버튼 위치를 시간대별 화면과 100% 동일하게 통일
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - **1. 상단 헤더 분리 버튼 제거 (`attendance/page.tsx`)**:
    - 기존 페이지 최상단 우측에 뜬금없이 위치하던 `[전원 출석 일괄 처리]` 버튼 제거
  - **2. 반 정보 카드 헤더 우측으로 버튼 위치 일치화 (`attendance/page.tsx`)**:
    - 시간대별 등원 예정 화면(타임슬롯 카드 헤더 우측 `[해당 시간 전원 출석]`)과 완벽하게 동일한 디자인 및 위치 구조로, 반별 출결 체크보드 상단 배너 우측에 `[전원 출석 일괄 처리]` 버튼 배치
    - 반 이름, 과목 태그, 시간표, 담당 강사, 원생 수 통계와 함께 우측에 일괄 출석 액션 제공
- **상태**: ✅ Next.js 16 프로덕션 빌드 (17/17 routes) 완벽 통과, Jest 109/109 PASS 검증 완료

### 📅 2026-09-02: 달력 팝오버 우측 잘림 방지 스마트 정렬 지원 및 전 페이지 드롭다운 UI 전면 통일
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - **1. 달력 팝오버 우측 잘림/가림 방지 (`CustomDatePicker.tsx`)**:
    - `align?: 'left' | 'right' | 'auto'` 옵션 및 뷰포트 공간 자동 감지 로직 탑재
    - 모달 우측 컬럼 등 여백이 좁은 영역에서는 자동으로 `right-0 left-auto`로 우측 정렬되어 팝오버가 절대 모달 경계 밖으로 넘치거나 잘리지 않도록 개선
  - **2. 전 페이지 드롭다운 UI 100% 통일 (`CustomDropdown.tsx`)**:
    - 기존 브라우저 기본 `<select>` 태그를 전면 제거하고 일관된 `CustomDropdown` (fullWidth, 검색 지원, 16px 둥근 모서리, 부드러운 애니메이션, 체크 아이콘)으로 전수 통일
    - **수업 일지 (`/class-logs`)**: 수업 반 선택 폼 및 상단 필터를 `CustomDropdown`으로 교체
    - **수강료 (`/tuition`)**: 청구서 일괄 생성 모달 내 청구 대상 반 선택을 `CustomDropdown`으로 교체
    - **리포트 관리 (`/reports`)**: 반 필터 및 리포트 발송 마법사 내 반/원생 선택을 `CustomDropdown`으로 교체
    - **캘린더 (`/calendar`)**: 상단 반 필터 및 일정 생성 모달 내 카테고리 선택을 `CustomDropdown`으로 교체
- **상태**: ✅ Next.js 16 프로덕션 빌드 (17/17 routes) 완벽 통과, Jest 109/109 PASS 검증 완료

### 📅 2026-09-02: 서버/DB 통신 장애 알림 단순 단일화 (기술적 URL 경로 노출 완전 제거) 및 알림 센터 우측 빨간색 느낌표(!) 배지 전면 탑재
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - **1. 시스템 알림 스토어 (`frontend/src/stores/useSystemAlertStore.ts`) 단일화 & 경로 제거**:
    - 기술적인 API 경로(`/students`, `/classes` 등) 노출을 일절 배제하고, 사용자 친화적인 단일 **"데이터베이스 / 서버 통신 장애"** 알림으로 단순화
    - 에러 메시지: *"데이터베이스 및 백엔드 서버에 연결할 수 없어 학생 및 반 목록 데이터를 정상적으로 불러오지 못했습니다. 잠시 후 다시 시도해주세요."*
  - **2. 알림 관리 센터 우측 빨간색 느낌표(`!`) 배지 전면 연동**:
    - **헤더 알림 벨 (`NotificationBell.tsx`)**: 통신 장애 시 종 모양 우측 상단에 튀어나오는 빨간색 느낌표 배지(`bg-rose-600 text-white font-black animate-bounce`) 및 팝오버 헤더 "알림 관리 센터" 우측에 빨간 느낌표 배지 표시
    - **네비게이션 바 (`AppNavbar.tsx`)**: 모바일 메뉴 "알림 센터" 우측에 빨간색 느낌표 배지 표시
    - **알림 관리 센터 (`frontend/src/app/notifications/page.tsx`)**: 상단 타이틀 "알림 관리 센터" 바로 우측에 빨간색 느낌표 배지 및 깔끔한 단일 장애 안내 카드 제공
    - **대시보드 (`frontend/src/app/dashboard/page.tsx`)**: "실시간 알림 및 카카오 안심 알림톡 관리 센터" 섹션 타이틀 우측에 빨간색 느낌표 배지 및 단일 장애 안내 카드 제공
- **상태**: ✅ Next.js 16 프로덕션 빌드 (17/17 routes) 완벽 통과, Jest 109/109 PASS 검증 완료

### 📅 2026-09-02: DB/서버 연결 장애 발생 시 알림 관리 센터 자동 장애 알림 생성 및 에러 배너 연동
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - **1. 시스템 장애 전역 상태 관리 (`frontend/src/stores/useSystemAlertStore.ts`) 신규 생성**:
    - DB 연결 끊김, 5xx 서버 에러, 네트워크 단절 발생 시 실시간으로 시스템 장애 알림(`DB_CONNECTION_ERROR`, `SERVER_ERROR`)을 자동 생성 및 로컬스토리지 보관
    - 알림 확인 완료(`markAsRead`), 개별 삭제(`clearAlert`), 전체 삭제(`clearAll`) 지원
  - **2. Axios 통신 에러 인터셉터 연동 (`frontend/src/lib/api.ts`)**:
    - Network Error 또는 5xx 서버 오류 감지 시 `useSystemAlertStore`에 "⚠️ 데이터베이스/서버 통신 장애" 알림 자동 등록
  - **3. 알림 벨 통합 팝오버 (`frontend/src/components/NotificationBell.tsx`)**:
    - 시스템 장애 알림 발생 시 종 아이콘에 깜빡이는 빨간색 배지(`bg-rose-600 animate-pulse`) 활성화
    - 팝오버 최상단에 **"시스템 & DB 연결 장애 알림"** 섹션 렌더링
  - **4. 알림 관리 센터 (`frontend/src/app/notifications/page.tsx`) & 대시보드 (`frontend/src/app/dashboard/page.tsx`)**:
    - 상단에 시스템 및 DB 연결 장애 알림 전용 섹션 제공 및 즉시 조치 지원
  - **5. 원생 관리 (`/students`) & 반 관리 (`/classes`) 에러 화면 보강**:
    - DB/서버 연결 실패 시 단순 빈 목록이 아닌, 빨간색 DB 연결 장애 배너 및 `[알림 센터 확인]` / `[다시 시도]` 액션 제공
- **상태**: ✅ Next.js 16 프로덕션 빌드 (17/17 routes) 완벽 통과, Jest 109/109 PASS 검증 완료

### 📅 2026-09-02: 카카오 알림톡 및 리포트 발송 전 실시간 미리보기 팝업 및 메시지 직접 수정 기능 전면 탑재
- **작성자**: Gemini (Frontend) & Claude (Backend)
- **백엔드 반영 사항**:
  - `backend/src/reports/dto/generate-report.dto.ts`: `customMessage?: string` 선택적 DTO 필드 추가
  - `backend/src/reports/reports.service.ts`: `sendStudentReport` 및 `sendClassReports`에서 사용자가 직접 수정한 `customMessage`를 카카오 알림톡 메시지 본문(`notification.message`)으로 우선 채택하도록 지원
  - `backend/src/reports/reports.controller.ts`: DTO `customMessage` 파라미터 전달 연동 완료
- **프론트엔드 반영 사항 (Gemini)**:
  - `src/lib/reports-service.ts`: `sendStudentReport`, `sendClassReports` API에 `customMessage?: string` 지원 추가
  - **리포트 관리 (`frontend/src/app/reports/page.tsx`)**:
    - **원생 1인 발송 모달**: 카카오 알림톡 스마트폰 노란색 말풍선 뷰(`bg-[#FAE100]`) + 발송 전 텍스트 직접 수정 에디터(`textarea`) + `[기본 문구로 초기화]` 버튼 탑재
    - **반 전체 일괄 발송 모달**: 대표 학생 알림톡 말풍선 미리보기 + 선생님 공통 추가 전달사항/메모 입력창(`textarea`) 제공
    - **상단 `[+ 리포트 발송]` 마법사 모달**: 실시간 알림톡 메시지 직접 편집 및 말풍선 뷰 제공
  - **원생 관리 (`frontend/src/app/students/page.tsx`)**:
    - `isReportModalOpen`: 실시간 카카오 알림톡 말풍선 미리보기 + 발송 전 메시지 자유 편집 기능 탑재
  - **반 관리 (`frontend/src/app/classes/page.tsx`)**:
    - `isClassReportModalOpen`: 반 대표 알림톡 메시지 미리보기 + 선생님 추가 당부사항 메모 입력창 탑재
  - **1초 출결 관리 (`frontend/src/app/attendance/page.tsx`)**:
    - `isDetailModalOpen`: 출결 상태 변경(출석/결석/지각/조퇴) 시 학부모님께 발송될 알림톡 문구 실시간 미리보기 및 직접 수정 기능 탑재
  - **수강료 & 수납 (`frontend/src/app/tuition/page.tsx`)**:
    - `isPaymentModalOpen`: 수납 처리 시 학부모님께 발송될 카카오 알림톡 영수증 안내 박스 탑재
- **상태**: ✅ Next.js 16 프로덕션 빌드 (17/17 routes) 완벽 통과, Jest 109/109 PASS 검증 완료

### 📅 2026-09-02: 전 페이지 팝업창 화면 밖 이탈 방지 규격화, 캘린더 주간 시간표 수강생 조회 모달 및 리포트 관리 대시보드 규격 전면 리뉴얼
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - **1. 모든 팝업창 화면 밖 이탈 방지 표준 규격화**:
    - 모든 모달 오버레이에 `fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto` 적용
    - 내부 모달 박스에 `max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden my-auto` 적용
    - 헤더/푸터 `shrink-0`, 본문 `flex-1 overflow-y-auto` 구조로 분리하여 모바일/태블릿 등 작은 화면에서도 절대 화면 밖으로 넘치지 않고 내부 스크롤 보장
    - 전체 도메인(`dashboard`, `students`, `classes`, `calendar`, `class-logs`, `tuition`, `attendance`, `reports`, `admin`) 전수 통일
  - **2. 캘린더 주간 시간표 반 클릭 시 수강생 명단 조회 모달 신규 구현**:
    - `frontend/src/app/calendar/page.tsx`: 주간 시간표(`WEEK_TIMETABLE`) 및 사이드바 수업 반 카드 클릭 시 대화형 수강생 명단 조회 모달(`isClassRosterModalOpen`) 오픈
    - 반 상세 정보(과목, 강사, 시간표, 정원 대비 수강생 수, 월 수강료), 배정된 원생 명단(이름, 학년, 학교, 학생/학부모 연락처 및 전화걸기), 해당 반 1초 출결 체크 바로가기 링크 제공
  - **3. 리포트 관리 페이지 (`frontend/src/app/reports/page.tsx`) 대시보드 규격 전면 리뉴얼**:
    - `dashboard` 페이지와 100% 동일한 헤더 배너(시스템 가동 중, 오늘 날짜 배지, 학원명 연동), 4대 통계 카드, 필터 툴바, 카드 그리드 및 테이블 레이아웃 구현
- **상태**: ✅ Next.js 16 프로덕션 빌드 (17/17 routes) 완벽 통과, Jest 109/109 PASS 검증 완료

### 📅 2026-09-02: 리포트 관리 페이지 UI 전면 리뉴얼 및 전체 페이지 모달 Backdrop/ESC 닫기 통일
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - **리포트 관리 페이지 (`frontend/src/app/reports/page.tsx`) 전면 리뉴얼**:
    - 다른 핵심 도메인(`students`, `classes`, `tuition`, `calendar`)과 100% 동일한 규격, 4대 통계 카드, 인디고/퍼플 테마 및 디자인 시스템 적용
    - 브라우저 기본 날짜 입력창을 공통 캘린더 컴포넌트인 **`CustomDatePicker`** 로 전면 교체하여 일관된 달력 UI 제공
    - 상단 우측에 **`[+ 리포트 발송]`** 액션 버튼 추가 및 (반 일괄 / 개별 원생) 통합 대화형 발송 마법사 모달 구현
  - **전체 페이지 모달 바깥(Backdrop) 클릭 닫기 및 ESC 키 제어 전수 통일**:
    - `students/page.tsx`: 원생 등록/수정, 원생 상세, CSV 대량 등록, 리포트 발송 모달의 backdrop 클릭 & ESC 닫기 통일
    - `classes/page.tsx`: 반 개설/수정, 수강생 배정, 반 리포트 발송 모달의 backdrop 클릭 & ESC 닫기 통일
    - `calendar/page.tsx`: 학원 이벤트 생성/수정 모달의 backdrop 클릭 & ESC 닫기 통일
    - `class-logs/page.tsx`: 수업 일지 작성/수정, 학생 누적 과제 리포트 모달의 backdrop 클릭 & ESC 닫기 통일
    - `tuition/page.tsx`: 월간 청구서 일괄 생성, 수납 처리, 청구서 할인/수정, 수납 영수증 모달의 backdrop 클릭 & ESC 닫기 통일
    - `attendance/page.tsx`: 출결 상세 수정, 통계 분석 모달의 backdrop 클릭 & ESC 닫기 통일
    - `admin/page.tsx`: 학원 요금제 구독 설정 모달의 backdrop 클릭 & ESC 닫기 통일
- **상태**: ✅ Next.js 16 빌드 성공 (17/17 routes), Jest 109/109 PASS 검증 완료

### 📅 2026-09-01: 독립 '리포트 관리' 전용 페이지(/reports) 신규 구축 및 네비게이션 동기화 완료
- **작성자**: Gemini (Frontend)
- **프론트엔드 반영 사항 (Gemini)**:
  - `frontend/src/app/reports/page.tsx` 신규 생성:
    - 상단 통계 카드 (재원생 수, 개설 반 수, 알림톡 엔진 상태, 권장 발송 주기)
    - 상단 글로벌 기간 선택 툴바 (이번 달, 지난 달, 최근 7일, 커스텀 날짜)
    - **반별 일괄 발송 탭 (`CLASSES`)**: 반 카드 목록, 대상 학년/시간표/인원 확인, `[반 전체 발송]` 원터치 실행 & 결과(성공/실패 내역) 모달
    - **원생별 개별 발송 탭 (`STUDENTS`)**: 실시간 검색 & 반 필터링, 원생별 `[미리보기 & 발송]` 대화형 모달 (출석률, 과제 이행률, 평균 점수, 생성된 카카오 알림톡 실시간 미리보기 및 원클릭 발송)
    - **템플릿 & 발송 가이드 탭 (`GUIDE`)**: 카카오 알림톡 리포트 규격 및 메시지 샘플 안내
  - `frontend/src/components/common/AppLayout.tsx`: 사이드바 '알림 & 운영' 그룹에 **`리포트 관리` (`/reports`)** 링크 추가
  - `frontend/src/components/common/AppNavbar.tsx`: 상단 및 모바일 네비게이션에 `리포트 관리` 링크 추가
  - `frontend/src/app/dashboard/page.tsx`: 6대 핵심 도메인 카드 그리드에 **`리포트 관리`** 바로가기 카드 배치
- **상태**: ✅ 백엔드/프론트엔드 100% 연동, Jest 109/109 PASS & Next.js 프로덕션 빌드(17/17 routes) 정상 통과

---

### 📅 2026-09-01: 원생 리포트(Reports) 백엔드 & 프론트엔드 연동 및 메인 랜딩 리뉴얼 완료
- **작성자**: Claude (Backend) & Gemini (Frontend)
- **변경/추가된 API 엔드포인트**:
  - `GET /reports/students/:id?periodStart=&periodEnd=`: 리포트 미리보기 (발송 안 함)
  - `POST /reports/students/:id/send`: 리포트 생성 + 카카오 알림톡 발송 (body: `{ periodStart, periodEnd }`)
  - `POST /reports/classes/:id/send`: 반 재원생 전원에게 일괄 발송 (부분 성공 — 일부 실패해도 나머지는 발송됨)
  - 모두 SUPER_ADMIN/OWNER/ADMIN/TEACHER 전용
- **주요 DTO 및 스키마 변경 사항**:
  - `StudentReportDto`: `{ studentId, studentName, periodStart, periodEnd, attendance: {totalDays, presentCount, absentCount, lateCount, earlyLeaveCount, attendanceRate}, homework: {totalAssignments, completedAssignments, completionRate, averageScore}, message }`
  - `SendReportResultDto`: 위 + `{ sentTo, notificationId }`
  - `ClassReportSendResultDto`: `{ classId, className, totalStudents, sentCount, failedCount, results: SendReportResultDto[], failed: [{studentId, studentName, reason}] }`
  - 신규 `NotificationType.STUDENT_REPORT` 값 추가
- **프론트엔드 반영 사항 (Gemini)**:
  - `frontend/src/lib/reports-service.ts`: 원생 리포트 미리보기, 1인 발송, 반 전체 일괄 발송 REST API 클라이언트 구현
  - `frontend/src/app/students/page.tsx`:
    - 원생 목록 테이블 행 및 상세 모달 내 `[학습/출결 리포트 발송]` 버튼 배치
    - 기간 선택 프리셋(이번 달, 지난 달, 최근 7일, 직접 입력) → 실시간 출결/과제 집계 통계 및 카카오 알림톡 메시지 본문 미리보기 → 알림톡 즉시 발송 2단계 대화형 모달 구현
  - `frontend/src/app/classes/page.tsx`:
    - 반 카드 액션바에 `[반 전체 카카오 리포트 일괄 발송]` 버튼 배치
    - 기간 선택 후 반 재원생 전원 일괄 발송 및 성공/실패 결과 요약 리포트 모달 구현
  - `frontend/src/app/page.tsx` (메인 랜딩 전면 리뉴얼):
    - 스크롤 다운 시 나타나는 **요금제 안내 섹션 (Pricing Table: Free, Pro, Enterprise 3단 비교 카드 & 혜택)** 구현
    - 스크롤 다운 시 순차적으로 나타나는 **도메인 핵심 기능 쇼케이스 (1초 출결 & 미등원 경고, 원생 CSV 일괄 등록 & 스마트 캘린더, 반 개설 & 스마트 학생 배정, 수업 일지 & 과제 검사, 수강료 복합 수납, 학습/출결 리포트 발송)**
    - 자주 묻는 질문(FAQ 아코디언) 및 인터랙티브 데모 대시보드 윈도우 프리뷰
- **상태**: ✅ 백엔드/프론트엔드 100% 연동, Jest 109/109 PASS & Next.js 프로덕션 빌드(16/16 routes) 정상 통과

---

### 📅 2026-09-01: 요금제 구독(Plan/Subscription) 모델 백엔드 & 프론트엔드 연동 완료
- **작성자**: Claude (Backend) & Gemini (Frontend)
- **변경/추가된 API 엔드포인트**:
  - `PATCH /admin/academies/:id/subscription`: 학원 요금제 등급 변경 (SUPER_ADMIN 전용)
  - `GET /auth/me` (및 로그인/회원가입 응답)의 `academy` 객체에 `subscription: { tier, status, expiresAt }` 필드 추가
  - `GET /admin/academies`, `GET /admin/academies/:id`의 응답에도 각 학원의 `subscription` 포함
- **주요 DTO 및 스키마 변경 사항**:
  - `PlanTier`: `FREE`(무료, 원생 50명/1개 학원 제한 — 참고용), `PRO`(유료, 무제한, 단일 학원), `ENTERPRISE`(유료, 무제한 + 본원/분원)
  - `SubscriptionStatus`: `ACTIVE`, `CANCELED`
  - 신규 가입 학원은 자동으로 `FREE` 구독 생성됨. 기존 학원은 구독 레코드가 없으며 FE에서도 `null` → FREE로 취급 (백엔드 기본 매핑 완료)
- **프론트엔드 반영 사항 (Gemini)**:
  - `frontend/src/types/auth.ts`: `PlanTier`, `SubscriptionStatus`, `SubscriptionSummary` 정의 및 `AcademySummary` 인터페이스에 반영
  - `frontend/src/lib/admin-service.ts`: `updateSubscription(academyId, dto)`, `getAcademyDetail(academyId)` 구현 및 `AdminAcademyItem` 타입 확장
  - `frontend/src/app/admin/page.tsx`:
    - 상단 통계 카드에 요금제별(Free/Pro/Enterprise) 입점 학원 수 실시간 집계 배지
    - 플랜별 필터 탭 (전체 / Free / Pro / Ent)
    - 학원 목록 테이블에 요금제 플랜 뱃지 및 만료일 표시, `[플랜 변경]` 액션 버튼
    - 3단계 플랜 선택 카드, 활성화 상태, 만료일 설정, 관리자 메모 및 감사 로그 사유 입력을 지원하는 **요금제 설정 대화형 모달** 구현
    - 감사 로그 테이블에서 플랜 변경(`UPDATE_SUBSCRIPTION_TIER`) 액션 시각적 구분
  - `frontend/src/components/common/AppNavbar.tsx`: 데스크톱/모바일 네비바에 학원명 옆 요금제 등급 배지(Free/Pro/Enterprise) 연동
  - `frontend/src/app/dashboard/page.tsx`: 상단 환영 영역에 학원 요금제 플랜 위젯 및 3대 플랜 비교/혜택 안내 모달 구현, 마운트 시 최신 프로필 자동 동기화
- **상태**: ✅ 백엔드/프론트엔드 100% 연동, Jest 103/103 PASS & Next.js 빌드 성공 검증 완료

---

### 📅 2026-09-01: 원생 CSV 일괄 등록 (Bulk Import) 백엔드 구현
- **작성자**: Claude (Backend)
- **변경/추가된 API 엔드포인트**:
  - `GET /students/bulk-import/template`: CSV 템플릿(헤더+예시 1행) 다운로드, OWNER/ADMIN 전용
  - `POST /students/bulk-import`: `multipart/form-data`, 필드명 `file` (CSV, 최대 5MB/2000행), OWNER/ADMIN 전용
- **주요 DTO 및 스키마 변경 사항**:
  - `BulkImportResultDto`: `{ totalRows, createdCount, skippedCount, failedCount, created: StudentResponseDto[], skipped: [{row, name, reason}], failed: [{row, name?, errors[]}] }`
  - CSV 헤더는 한글(이름/성별/생년월일/학교명/학년/학생연락처/학부모연락처/학부모이름/학부모관계/재원상태/등록일/메모) 또는 영문 필드명 모두 허용. 필수는 `이름`/`학부모연락처`뿐.
  - `성별`은 남/여 또는 MALE/FEMALE, `재원상태`는 재원/휴원/퇴원 또는 ACTIVE/ON_LEAVE/DISCHARGED 모두 인식.
  - 동일 학원 내 (이름, 학부모연락처) 중복 행은 생성하지 않고 건너뜀(덮어쓰지 않음, 재업로드 안전).
  - 검증 실패 행은 전체를 막지 않고 `failed[]`에 기록, 나머지는 정상 등록(부분 성공).
- **프론트엔드 반영 사항 (Gemini)**:
  - `frontend/src/lib/students-service.ts`: `downloadBulkImportTemplate()` 및 `bulkImportStudents(file: File)` API 클라이언트 구현 완료
  - `frontend/src/app/students/page.tsx`: 상단 액션바 `[CSV 일괄 등록]` 버튼 및 대화형 드래그앤드롭 업로드 마법사 모달 구현
  - 3단계 마법사 UX: (1) 표준 CSV 템플릿 다운로드 및 파일 선택/드롭, (2) 실시간 유효성 검사 및 프로그레스, (3) 결과 리포트(총 건수, 신규 등록 성공, 중복 스킵, 검증 실패 내역 테이블) 및 원생 목록 자동 갱신
- **상태**: ✅ 백엔드/프론트엔드 연동 및 `next build` 100% 정상 검증 완료

---

### 📅 2026-09-01: Calendar (학원 이벤트 캘린더) 도메인 & UI 연동 완료
- **작성자**: Claude (Backend) & Gemini (Frontend)
- **백엔드 변경 사항 (Claude)**:
  - `AcademyEvent` Prisma 모델 및 DB 마이그레이션 (`20260901034633_add_calendar_events`)
  - `CalendarController` / `CalendarService` (`/calendar/events`) CRUD 엔드포인트 구현 완료
  - `EventCategory` (`ACADEMY`, `EXAM`, `SPECIAL`, `HOLIDAY`, `CONSULTATION`, `OTHER`), `EventColor` (`INDIGO`, `PURPLE`, `ROSE`, `AMBER`, `EMERALD`, `BLUE`, `SLATE`) Enum 대문자 표준화
- **프론트엔드 반영 사항 (Gemini)**:
  - `frontend/src/lib/calendar-service.ts`: 백엔드 `/calendar/events` REST API 연동 완료
  - `frontend/src/app/calendar/page.tsx`: 월간 그리드, 주간 시간표, 일정 목록 3대 뷰 및 등원 수강생 실시간 집계 뷰 완성
  - 대시보드 바로가기 정리, 전 페이지 `Phase ~` 태그 제거, 캘린더 상단 컨트롤 툴바 재배치 완료
- **상태**: ✅ 백엔드/프론트엔드 빌드 & 테스트 100% PASS 및 `origin/dev` 푸시 완료

---

## 📝 신규 백엔드 업데이트 기록 템플릿 (Claude 작성용)

```markdown
### 📅 [날짜/시간]: [기능 또는 도메인명] 업데이트
- **작성자**: Claude (Backend)
- **변경/추가된 API 엔드포인트**:
  - `METHOD /api/path`: [설명]
- **주요 DTO 및 스키마 변경 사항**:
  - [필드명, 타입, 필수 여부 등]
- **프론트엔드 연동 요청 사항 (Gemini에게 전달)**:
  - [예: `src/lib/xxx-service.ts`에 신규 함수 추가 및 `xxx/page.tsx`에 연동 필요]
- **상태**: ⏳ Gemini 프론트엔드 연동 대기 중
```
