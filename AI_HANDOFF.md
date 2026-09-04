# 🤝 AI Handoff & Synchronization Log (AI_HANDOFF.md)

> 📌 **사용 목적**: 백엔드 전담 **Claude**와 프론트엔드 전담 **Gemini** 간의 비동기 협업 및 변경 사항 동기화 문서입니다.
> - **Claude (Backend)**: 백엔드 API 신규 생성, DTO 변경, DB 스키마 수정, 비즈니스 로직 업데이트 시 아래에 변경 사항과 프론트엔드 연동 가이드를 기록합니다.
> - **Gemini (Frontend)**: 이 파일의 최신 백엔드 변경 내역을 읽고, 프론트엔드 API 클라이언트(`src/lib/*-service.ts`) 및 UI 컴포넌트(`src/app/*`)를 즉시 업데이트한 뒤 빌드 검증 및 Git 커밋/푸시를 완료하고 상태를 갱신합니다.
> - **📦 아카이빙 규칙 (2026-09-04 도입)**: 파일이 계속 커지면 매 세션 읽는 비용이 커지므로, 아래 "최근 동기화 히스토리"는 **당일 날짜 항목만** 유지합니다. 날짜가 지나면(다음 날 작업 시작 시) 그 항목들을 [`AI_HANDOFF_ARCHIVE.md`](AI_HANDOFF_ARCHIVE.md) 맨 위(최신 항목 바로 아래)로 그대로 옮기세요. 과거 이력이 필요하면 그 파일을 참고합니다.

---

## 🔄 최근 동기화 히스토리 (최신순)

### 📅 2026-09-04: P1(seed) 완료 + 프론트엔드(Gemini) 요청 사항 (개발 전용 자동 로그인)
- **작성자**: Claude (Backend)
- **P1 완료**: `prisma/seed.ts`는 이미 `admin@classhelper.kr`(SUPER_ADMIN)/`owner@classhelper.kr`(OWNER) 데모 계정을 생성하도록 작성돼 있었음 — 실제 문제는 배포된 EC2 DB에 seed가 한 번도 실행된 적이 없었던 것. `backend/Dockerfile`의 컨테이너 시작 CMD에 `yarn prisma:seed`를 추가해(마이그레이션 다음, 서버 기동 전, 전부 upsert라 반복 실행 안전) 매 배포마다 자동 보장되도록 함. 비밀번호는 둘 다 `password123!` (데모용 — 실제 운영 전 교체 필요).
- **P2~P4는 아직 미착수** (교직원 API, 학원코드 승인, 공지/메모, 벌크 배정, 아이디/비번 찾기) — 결제 게이트웨이/카카오 실 API 연동 이후로 순서 조정 예정 ([[classhelper-deployment-status]] 메모리 참고).

#### 📌 프론트엔드(Gemini) 요청 사항 (신규)
1. **[DX 개선] 개발 전용 자동 로그인 / 역할 전환 버튼**:
   - **배경**: 로컬 테스트 시 화면 하나 보려면 프론트+백엔드 둘 다 띄우고 매번 로그인 폼을 입력해야 해서 번거로움. 이전에 로그인 페이지에 있던 테스트 계정 자동입력 기능은 배포된 실제 로그인 화면에 그대로 노출돼 보안 문제로 제거된 바 있음(`dfed361`) — 그 방식 재도입은 금지.
   - **요구사항**: `NODE_ENV=development`(또는 로컬 전용 플래그)일 때만 렌더링되는 "SUPER_ADMIN/OWNER/TEACHER로 보기" 등 원클릭 버튼 추가. **프로덕션 빌드에는 절대 포함되지 않아야 함.** 백엔드는 여전히 로컬에서 실행 중이어야 함(실제 API/DB 사용) — 로그인 폼 입력 절차만 스킵.

---

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

> 📦 **9/2 이전 기록은 [`AI_HANDOFF_ARCHIVE.md`](AI_HANDOFF_ARCHIVE.md)로 옮겨졌습니다** (Docker/EC2 배포 인프라, 교직원 페이지, 수강료/모달 표준화, 리포트 도메인, 구독 모델, CSV 일괄등록, 캘린더 도메인 등). 과거 이력이 필요하면 그 파일을 참고하세요.

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
