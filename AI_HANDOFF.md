# 🤝 AI Handoff & Synchronization Log (AI_HANDOFF.md)

> 📌 **사용 목적**: 백엔드 전담 **Claude**와 프론트엔드 전담 **Gemini** 간의 비동기 협업 및 변경 사항 동기화 문서입니다.
> - **Claude (Backend)**: 백엔드 API 신규 생성, DTO 변경, DB 스키마 수정, 비즈니스 로직 업데이트 시 아래에 변경 사항과 프론트엔드 연동 가이드를 기록합니다.
> - **Gemini (Frontend)**: 이 파일의 최신 백엔드 변경 내역을 읽고, 프론트엔드 API 클라이언트(`src/lib/*-service.ts`) 및 UI 컴포넌트(`src/app/*`)를 즉시 업데이트한 뒤 빌드 검증 및 Git 커밋/푸시를 완료하고 상태를 갱신합니다.
> - **📦 아카이빙 규칙 (2026-09-04 도입)**: 파일이 계속 커지면 매 세션 읽는 비용이 커지므로, 아래 "최근 동기화 히스토리"는 **당일 날짜 항목만** 유지합니다. 날짜가 지나면(다음 날 작업 시작 시) 그 항목들을 [`AI_HANDOFF_ARCHIVE.md`](AI_HANDOFF_ARCHIVE.md) 맨 위(최신 항목 바로 아래)로 그대로 옮기세요. 과거 이력이 필요하면 그 파일을 참고합니다.

---

## 🔄 최근 동기화 히스토리 (최신순)

### 📅 2026-09-08: 역할별 커스텀 권한(Role Permissions) 백엔드 구현
- **작성자**: Claude (Backend)
- **작업 배경**: 사용자 요청 — 원장이 실장/강사/조교 각 역할의 메뉴별 "수정" 권한을 교직원 관리 탭에서 커스텀할 수 있게. 초기 기본값은 최소 권한(강사/조교는 대부분 보기만), 이후 원장이 변경 가능.
- **신규 API 엔드포인트**:
  - `GET /auth/role-permissions` (`OWNER`, `ADMIN`): 3역할(ADMIN/TEACHER/STAFF)×8메뉴 = 24개 항목을 항상 전부 반환(미설정은 기본값으로 채움).
  - `PATCH /auth/role-permissions` (`OWNER` 전용): 변경할 항목만 전달. `{ "permissions": [{ "role": "TEACHER", "module": "TUITION", "canEdit": true }] }`
- **기본값** (원장이 아직 아무것도 안 바꿨을 때):
  - ADMIN: 8개 메뉴 전부 수정 가능(기존 동작과 동일, 변화 없음)
  - TEACHER: 출결(ATTENDANCE)·수업일지(CLASS_LOGS)·리포트(REPORTS)만 수정 가능, 나머지(원생관리/반관리/수강료/캘린더/알림)는 보기만
  - STAFF: 출결만 수정 가능, 나머지는 보기만
- **⚠️ 중요 — 8개 메뉴에서 새로운 `403` 케이스가 생겼습니다**: 원장이 교직원 관리에서 특정 역할의 권한을 끄면, 기존에 통하던 요청(예: 강사의 원생 정보 수정)이 `403 Forbidden`을 반환합니다. 에러 메시지: `"원장이 이 메뉴에 대한 수정 권한을 아직 부여하지 않았습니다."` — 기존 권한 부족(`"해당 작업에 대한 접근 권한이 없습니다."`)과 문구가 다르니, 프론트에서 이 메시지를 그대로 노출하면 사용자가 "역할 자체가 안 되는 것"과 "원장이 아직 안 켜준 것"을 구분할 수 있습니다.
- **프론트 작업 필요 사항 (아직 미구현)**:
  1. **교직원 관리 탭에 "권한 설정" 버튼** → 3역할×8메뉴 매트릭스 UI(토글), `GET/PATCH /auth/role-permissions` 연동. 실장 로그인 시엔 조회만 되고 저장 버튼은 비활성화(백엔드도 `PATCH`는 원장 전용으로 막지만 UX상 미리 막는 게 맞음).
  2. 각 메뉴 화면에서 로그인한 사용자의 `canEdit`이 `false`인 항목은 수정/삭제 버튼을 미리 숨기거나 비활성화(백엔드가 최종 방어선이므로 필수는 아니지만 UX 개선). `GET /auth/role-permissions`를 앱 진입 시 한 번 불러와 클라이언트에 캐시해두고 자기 role에 맞는 행만 걸러 쓰는 방식 권장.
- **DTO/스키마**: 신규 `RolePermission` 모델(+`PermissionModule` enum, 8종), 마이그레이션 `20260908070000_add_role_permissions`.
- **상태**: ⏳ 프론트엔드 연동 대기 중

---

### 📅 2026-09-08: 사이트 방문 통계(Site Visit Analytics) 백엔드 구현 및 프론트엔드 실데이터 연동 완료
- **작성자**: Claude (Backend) & Gemini (Frontend)
- **작업 배경**: 사용자 요청 — "날짜 기준 방문자 수 확인 메뉴", 이어서 "로그인/회원가입/학원개설 수도 함께" 확장.
- **신규 API 엔드포인트**:
  - `POST /analytics/track` (비인증, `/auth/login`과 동일 Throttle): `{ "visitorId": "<uuid>" }` — 프론트가 로컬에 생성/보관한 익명 UUID로 방문 기록. IP/User-Agent 등 PII는 저장하지 않음.
  - `GET /analytics/stats?startDate=&endDate=` (`SUPER_ADMIN`): 날짜별 `{ date, anonymousVisitors, loginCount, newSignups, newAcademies }` 배열. 날짜 생략 시 최근 30일, 빈 날짜도 0으로 채워 반환.
  - 로그인 시(`POST /auth/login`) 자동으로 `loginCount`에 반영됨(별도 프론트 연동 불필요).
- **프론트엔드 실데이터 연동 완료 내역 (Gemini)**:
  1. **API 클라이언트 표준화 (`src/lib/admin-service.ts`)**:
     - 기존 가짜 목업 함수(`generateMockVisitorData`)를 완전 제거.
     - `DailyAnalyticsStat` (`date`, `anonymousVisitors`, `loginCount`, `newSignups`, `newAcademies`) 및 `VisitorAnalyticsSummary` 인터페이스 정의.
     - `adminService.trackVisitor(visitorId)` (`POST /analytics/track`) 및 `adminService.getVisitorAnalytics(startDate, endDate)` (`GET /analytics/stats`) 실데이터 호출 구현.
  2. **익명 방문자 자동 비콘 추적 유틸 (`src/lib/analytics-tracker.ts`, `src/components/common/AppLayout.tsx`, `src/app/login/page.tsx`)**:
     - `localStorage` 기반 익명 UUID(`classhelper_visitor_id`) 자동 생성 및 하루 1회 중복 방지 캐싱.
     - 메인 레이아웃 및 로그인 페이지 마운트 시 `ensureSiteVisitTracked()`를 통해 백엔드 `POST /analytics/track` 자동 전송 (비로그인 방문자 UV 집계 지원, 실패 시 무시).
  3. **관리자 포털 방문자 & 플랫폼 성장 분석 UI 개편 (`src/app/admin/page.tsx`)**:
     - 목업 전용 필드(PV, 기기 비율, 최다 서비스 등)를 제거하고, 백엔드 실데이터 기반의 4대 핵심 지표로 재편: **총 순방문자(UV, 비로그인+로그인), 로그인 교직원 수, 신규 가입 교직원 수, 신규 개설 학원 수**.
     - 일일 방문 & 성장 추이 스택 바 차트: 비로그인(퍼플) + 로그인(인디고) 스택 막대, 신규 가입자/학원 개설 뱃지 표시. 막대 클릭 시 해당 일자의 상세 지표 팝업 연동.
     - 날짜별 방문 & 성장 기록 테이블: 일자별 총 UV, 비로그인, 로그인, 신규 가입자 뱃지, 신규 학원 뱃지 및 일일 순성장률 태그 렌더링.
     - 실데이터 기준 CSV 내보내기 헤더 및 데이터 포맷 갱신.
- **DTO/스키마**: 신규 `SiteVisit` 모델(+`VisitorType` enum), 마이그레이션 `20260908060000_add_site_visits`.
- **빌드 검증**: `next build` 20개 라우트 프로덕션 빌드 정상 통과 (exit code 0).
- **상태**: ✅ 백엔드 및 프론트엔드 연동 완료

---

### 📅 2026-09-08: [보안 수정] 동료 실장 계정 탈취 체인 차단 (`/security-review`에서 발견)
- **작성자**: Claude (Backend)
- **작업 배경**: 바로 아래 "교직원 관리 실제 백엔드 구현" 커밋(`438c418`) 직후 사용자가 보안 점검 요청 → `PATCH /auth/staff/:id`(정보 수정)와 `PATCH /auth/staff/:id/password`(비번 초기화)를 조합하면, 실장 A가 동료 실장 B를 먼저 `role: "TEACHER"`로 강등시킨 뒤 곧바로 비번 초기화 API를 호출해 "대상이 OWNER/ADMIN이면 거부" 방어를 우회할 수 있는 체인을 발견.
- **변경 사항**: `PATCH /auth/staff/:id` 요청 시, 대상이 `ADMIN`이고 `role` 필드를 바꾸려는 경우 요청자가 `OWNER`가 아니면 이제 `403`을 반환한다(이름/연락처만 바꾸는 요청은 실장끼리도 그대로 허용). **새 DTO 필드나 응답 형태 변경은 없음** — 순수 인가 로직 강화이므로 프론트 추가 작업은 필요 없고, 기존 에러 핸들링(범용 403 처리)이면 충분함.
- **상태**: ✅ 백엔드 검증 완료 (auth.service.spec.ts Jest 통과) 및 커밋 반영

---

### 📅 2026-09-08: 교직원 관리 실제 백엔드 구현 + 학원코드 자가입 + 비번초기화 보안 강화
- **작성자**: Claude (Backend)
- **작업 배경**:
  - 사용자 리포트: "교직원 관리 페이지에서 원장 본인도 현재 비밀번호 없이 새 비밀번호로 변경할 수 있다."
  - 확인 결과 **`GET/PATCH/DELETE /auth/staff/*`가 백엔드에 아예 존재하지 않았음**. `staff-service.ts`가 이 경로들을 호출하다 실패하면 `catch`로 무시하고 `localStorage` 목업으로 폴백하며 가짜 성공 메시지를 보여주고 있었다 — 즉 지금까지 교직원 목록/수정/비번초기화/퇴사 처리가 **전부 프론트 전용 목업**이었고 실제로는 아무것도 저장되지 않았다.
  - 사용자 요청 3가지: (1) 원장/실장 본인 행에는 비번 초기화 버튼이 없어야 함, (2) 본인 비밀번호 변경은 "보안 관리" 사이드바 탭으로 분리(프론트 작업, 사용자가 직접 진행), (3) 원장/실장이 직접 계정을 만드는 대신 학원코드로 강사/조교가 자가입하도록.
- **변경/추가된 API 엔드포인트**:
  - `GET /auth/staff?includeInactive=false` (OWNER/ADMIN): 교직원 목록. 기본 재직만, `includeInactive=true`면 퇴사자 포함.
  - `PATCH /auth/staff/:id` (OWNER/ADMIN): 이름/연락처/직책 수정. 대상이 OWNER면 403.
  - `PATCH /auth/staff/:id/password` (OWNER/ADMIN, Body 없음): 비밀번호 초기화 → `tempPassword` 1회 반환. **대상이 OWNER/ADMIN이면 403** — 서버가 실제로 막는다(프론트 버튼 숨김과 별개).
  - `DELETE /auth/staff/:id` (OWNER/ADMIN): 퇴사 처리(소프트 삭제, `status=INACTIVE`). 대상이 OWNER이거나 본인이면 403.
  - `POST /auth/staff-join-code` / `GET /auth/staff-join-code` (OWNER/ADMIN): 학원코드 자가입용 코드 발급·재발급 / 조회(kiosk-token과 동일 패턴).
  - `POST /auth/join-staff` (비인증, `/auth/login`과 동일 Throttle): `{ code, email, password, name, phone?, role }`로 강사/조교 본인이 즉시 자가입 + 자동 로그인(토큰 발급). `role`은 TEACHER/STAFF만 가능.
  - 기존 `POST /auth/register-staff`(원장/실장 직접 등록)는 그대로 병행 유지.
- **주요 DTO 및 스키마 변경 사항**:
  - `User.status: UserStatus`(`ACTIVE`/`INACTIVE`, 신규 enum, 신규 컬럼) — 하드 삭제 대신 소프트 삭제(교직원의 수업일지/결제이력 등 참조 데이터 보존 목적). `INACTIVE`는 로그인 차단.
  - `Academy.staffJoinCode: String?` (신규, unique) — `kioskToken`과 동일한 성격.
  - `StaffMemberResponseDto` 신규(`UserProfileDto` + `status`, `taughtClassesCount`, `classLogsCount`, `processedPaymentsCount`).
  - **보안 수정**: `RegisterStaffDto.role`이 기존엔 `UserRole` 전체(`OWNER`/`SUPER_ADMIN` 포함)를 허용해 실장이 자기 자신을 원장/최고관리자로 승격시킬 수 있는 권한상승 취약점이 있었음 — `ADMIN`/`TEACHER`/`STAFF`로만 제한. `UpdateStaffDto.role`/`JoinStaffDto.role`도 동일 제한.
  - 마이그레이션 `20260908050000_add_staff_management` — **이 세션도 샌드박스에 docker/DB 접근 권한이 없어 실제 DB에는 미적용**(파일만 수기 작성, `prisma generate`로 타입만 갱신). 배포 시 Dockerfile CMD가 자동 반영, 로컬 dev DB는 별도 `migrate deploy` 필요.
- **프론트엔드 연동 반영 내역 (Gemini)**:
  1. **`staff-service.ts` 전면 개편 및 실제 백엔드 연동**:
     - 기존 `localStorage` 기반 mock 폴백을 완전 제거하고 백엔드 API 에러가 사용자에게 투명하게 전달되도록 표준화.
     - `getStaffList(includeInactive)`, `updateStaff`, `resetStaffPassword`, `deleteStaff`, `getStaffJoinCode`, `generateStaffJoinCode`, `joinStaffByCode` 구현.
     - `authService.joinStaff` 메서드 추가 연동.
  2. **교직원 관리 페이지(`src/app/staff/page.tsx`) 권한 및 UI 보안 제한 강화**:
     - `OWNER`(원장), `ADMIN`(실장), `isCurrentUser`(본인)에 대해 "비번 초기화" 버튼 렌더링 원천 차단 (`canResetPassword = !isOwner && !isAdmin && !isCurrentUser`).
     - 비번 초기화 모달을 수동 입력 대신 10자리 임시 비밀번호 1회 발급 확인 플로우로 전환 및 1회성 확인 모달 연동.
     - 상단에 "학원 초대 코드" 모달(조회, 재발급, 코드 및 초대 링크 원클릭 복사) 탑재.
     - 퇴사자 포함 필터(`includeInactive`) 및 상태 뱃지(`ACTIVE` / `INACTIVE`), 복합 통계 연동.
  3. **사이드바 "비밀번호 변경" 전용 탭 명칭 변경 및 `/change-password` 전체 사이드바 유지 (`src/components/common/AppLayout.tsx`, `src/app/change-password/page.tsx`)**:
     - 좌측 사이드바 메뉴 탭 이름을 기존 "보안 관리"에서 "비밀번호 변경"(`KeyRound` 아이콘)으로 직관적으로 변경.
     - 비밀번호 변경 페이지(`/change-password`) 접속 시에도 타 페이지와 동일하게 좌측 사이드바 및 전역 레이아웃(`AppLayout`)을 유지하도록 구조 개편.
     - 임시 비밀번호 변경 대상(`mustChangePassword`)인 경우 타 메뉴 클릭을 차단하고 `opacity-40 cursor-not-allowed` 시각 피드백 제공.
     - **사이드바 스크롤 상태 유지**: 페이지 전환 시 사이드바가 최상단으로 리셋되어 하단 탭이 시야에서 사라지던 문제를 해결. 모듈 레벨 변수 및 `sessionStorage` 기반 스크롤 위치 기억/복원과 활성 탭 `scrollIntoView({ block: 'nearest' })` 자동 동기화 탑재.
     - **중복 뒤로가기 버튼 정리**: 좌측 사이드바 내 모든 이동 메뉴가 항시 제공되므로, 화면 상단 및 하단 카드의 불필요한 '대시보드로 돌아가기' 버튼을 제거하여 깔끔한 레이아웃 완성.
  4. **학원 코드 기반 교직원 자가입 플로우 및 로그인 UI 정밀화 (`src/app/login/page.tsx`, `src/app/join/page.tsx`)**:
     - 로그인 페이지 상단에 `[✨ 교직원 초대 가입]` 탭 추가: 학원 초대 코드, 직책(강사/조교), 이름, 이메일, 연락처, 비밀번호 입력 후 원클릭 자가입 및 대시보드 자동 로그인.
     - 초대 링크(`/join?code=...` 또는 `/login?tab=join&code=...`) prefill 및 자동 탭 전환 지원.
     - `activeTab === 'join'` 선택 시 상단 타이틀/설명이 출석 키오스크로 노출되던 조건문 분기 버그 수정.
     - 컨테이너 너비를 `sm:max-w-lg`로 확장하고 탭 텍스트에 `whitespace-nowrap`을 적용하여 3개 탭("로그인", "교직원 초대 가입", "출석 키오스크")이 줄바꿈 없이 깔끔하게 1줄로 표시되도록 UI 개선.
  5. **관리자 플랫폼(`SUPER_ADMIN`) 중복 바로가기 메뉴 제거 & 날짜별 사이트 방문자 분석 메뉴 신설 (`src/app/admin/page.tsx`, `src/lib/admin-service.ts`, `src/components/common/AppLayout.tsx`)**:
     - **중복 바로가기 메뉴 완전 제거**: 좌측 사이드바가 플랫폼 전체 메뉴의 단일 진입점이 되도록, `/admin` 내부 상단의 탭 네비게이션 필즈 및 Overview 탭의 "세부 관리 빠른 이동" 카드 블록, 학원 목록 미리보기의 바로가기 버튼을 제거하고 요금제 플랜 점유율 카드를 전폭으로 확장. 상단 헤더는 현재 활성 탭에 맞춰 섹션명과 설명이 동적으로 변경되도록 개선.
     - **좌측 사이드바 전용 메뉴 탑재**: `superAdminNavGroups`에 `[사이트 방문자 분석]` (`/admin?tab=visitors`, `Users` 아이콘) 메뉴 탭 추가.
     - **날짜 기준 사이트 방문자 분석 메뉴 구현**:
       - 조회 기간 필터(최근 7일 / 14일 / 30일 프리셋 및 시작일~종료일 직접 지정) 및 일자별 방문 통계 CSV 파일 다운로드 기능 탑재.
       - 4대 주요 KPI 카드: 기간 총 순 방문자수(UV), 총 페이지뷰(PV 및 인당 평균 PV), 일평균 방문자, 신규 vs 재방문 비율 바 게이지.
       - 날짜별 일일 방문자 추이 시각화 바 차트 (막대 클릭 시 해당 일자의 UV, PV, 로그인 사용자, 기기 점유율, 주요 활동 서비스 콜아웃 노출).
       - 일자별 방문 기록 상세 테이블 (날짜 검색, 최신순/과거순 정렬, 요일 표기, UV/PV, 신규/재방문, 로그인 교직원, PC/모바일/태블릿 기기 비율, 최다 이용 서비스 뱃지).
     - **백엔드(Claude) 향후 연동 참고사항**:
       - 엔드포인트: `GET /admin/analytics/visitors` (Query: `startDate?: string, endDate?: string`, YYYY-MM-DD 형식)
       - 권한: `SUPER_ADMIN` 전용
       - 응답 인터페이스: `VisitorAnalyticsSummary` (`totalVisitors`, `totalPageViews`, `avgDailyVisitors`, `todayVisitors`, `todayPageViews`, `newVisitorPercentage`, `returningVisitorPercentage`, `dailyStats: DailyVisitorStat[]`)
       - 프론트엔드([`src/lib/admin-service.ts`](frontend/src/lib/admin-service.ts))의 `getVisitorAnalytics()`가 이미 해당 엔드포인트를 우선 호출하도록 설계되어 있어, 백엔드에서 API 구현 완료 시 별도 프론트 수정 없이 즉시 실데이터로 자동 전환됩니다.
- **빌드 검증**: `next build` 20개 라우트 정상 빌드 통과 (exit code 0)
- **상태**: ✅ 백엔드 및 프론트엔드 연동 완료

---

### 📅 2026-09-08: 비밀번호 변경 화면 구현, 로그인/대시보드 강제 변경 가드 및 교직원 임시 비밀번호 1회 발급 연동 완료
- **작성자**: Gemini (Frontend)
- **작업 배경**:
  - Claude가 구현한 `PATCH /auth/change-password` 및 `POST /auth/register-staff` 임시 비밀번호 발급 플로우에 맞춰 프론트엔드 전체 연동 완료.
  - 임시 비밀번호로 발급받은 계정이 최초 로그인 시 시스템에 진입하기 전 반드시 비밀번호를 변경하도록 강제 가드 처리.
  - 원장이 교직원 등록 시 비밀번호 입력을 비워두면 안전한 10자리 임시 비밀번호가 자동 발급되고, 이를 즉시 복사하여 전달할 수 있는 1회성 전용 모달 UI 구현.
  - 일반 사용자도 언제든 비밀번호를 변경할 수 있는 전용 라우트(`/change-password`) 및 메뉴 링크 지원.
- **프론트엔드 반영 사항 (Gemini)**:
  1. **타입 정의 및 API 서비스 확장**:
     - `src/types/auth.ts`: `UserProfile.mustChangePassword?: boolean`, `ChangePasswordPayload`, `ChangePasswordResponse` 추가.
     - `src/types/staff.ts`: `StaffMember.mustChangePassword`, `StaffMember.tempPassword`, `StaffRegisteredResult` 추가.
     - `src/lib/auth-service.ts`: `changePassword(payload)` 메서드 연동 (`PATCH /auth/change-password`).
     - `src/lib/staff-service.ts`: `createStaff` 호출 시 비밀번호 미입력 시 필드를 생략하여 백엔드 임시 비밀번호 자동 생성을 트리거하고, 응답의 `tempPassword`를 반환받도록 개선.
  2. **비밀번호 변경 전용 페이지 신규 구축 (`src/app/change-password/page.tsx`)**:
     - 임시 비밀번호 계정(`mustChangePassword: true`) 대상 강제 변경 알림 및 자율 변경 모드 지원.
     - 현재 비밀번호 대조, 새 비밀번호 4대 보안 정책(8자 이상, 영문, 숫자, 특수문자) 실시간 검증 체크리스트 및 일치 여부 확인 UI 탑재.
     - 변경 성공 시 Zustand 스토어(`user.mustChangePassword = false`) 자동 갱신 및 대시보드/관리자 페이지 이동.
  3. **로그인 및 전역 레이아웃 보안 가드 탑재**:
     - `src/app/login/page.tsx`: 로그인 성공 시 `mustChangePassword === true`인 경우 `/change-password`로 즉시 강제 리다이렉트. 로그인 활성 세션 배너에서도 상태에 맞춰 비밀번호 변경 버튼 노출.
     - `src/components/common/AppLayout.tsx`: `mustChangePassword` 상태의 사용자가 타 페이지 접근 시 `/change-password`로 강제 이동시키는 가드 탑재. 사이드바 및 모바일 드로어 하단에 "비밀번호 변경" 바로가기 링크 추가.
     - `src/app/admin/page.tsx`: 최고관리자 포털에서도 `mustChangePassword` 체크 가드 추가.
  4. **교직원 등록 폼 및 임시 비밀번호 1회성 발급 모달 (`src/app/staff/page.tsx`)**:
     - 교직원 등록 모달에서 비밀번호 입력을 선택사항으로 변경 (미입력 시 10자리 임시 비밀번호 자동 발급 안내).
     - 등록 완료 시 서버가 반환한 `tempPassword`를 모노스페이스로 강조 표시하고 1회 복사할 수 있는 전용 모달 탑재 (클립보드 원클릭 포맷 복사 및 경고 문구 제공).
- **빌드 검증**: `yarn frontend:build` 19개 전 라우트 정상 통과 (exit code 0)
- **상태**: ✅ 백엔드 및 프론트엔드 연동 완료

---

### 📅 2026-09-07: 강사/직원 등록 시 임시 비밀번호 자동 발급 + 최초 로그인 비밀번호 변경 강제
- **작성자**: Claude (Backend)
- **작업 배경**: 사용자 질문 — "강사/실장/조교 로그인은 원장 동의가 필요한데, 원장이 직접 로그인시켜주는 게 나을지 권한 기반 셀프 로그인이 나을지" → 이미 구현된 "원장이 `POST /auth/register-staff`로 직접 계정을 만드는" 방식(A안)을 유지하되, 원장이 비밀번호를 직접 타이핑해서 알려줘야 했던 UX만 개선하기로 결정. (셀프가입+승인 플로우는 로드맵상 이미 "학원코드 승인"으로 후순위 연기된 상태라 이번엔 만들지 않음.)
- **변경/추가된 API 엔드포인트**:
  - `POST /auth/register-staff`: `RegisterStaffDto.password`가 이제 **선택**. 생략하면 서버가 정책(영문+숫자+특수문자, 8자+)을 항상 만족하는 임시 비밀번호를 자동 생성.
  - `PATCH /auth/change-password` (신규, 인증 필요, 전 역할 공통): `{ currentPassword, newPassword }` → 현재 비밀번호 확인 후 변경, `mustChangePassword` 해제. `/auth/login`과 동일한 Throttle(60초 5회) 적용.
- **주요 DTO 및 스키마 변경 사항**:
  - `User.mustChangePassword: Boolean @default(false)` 신규 컬럼(마이그레이션 `20260907080000_add_must_change_password`) — 원장이 대신 계정을 만든 경우(비밀번호를 직접 지정했든 자동 생성했든) 항상 `true`로 시작.
  - `UserProfileDto`에 `mustChangePassword: boolean` 추가 → **로그인/`GET auth/me` 응답에 항상 포함**됨.
  - `register-staff` 응답 타입이 `StaffRegisteredResponseDto`(`UserProfileDto` + 선택적 `tempPassword?: string`)로 변경 — `tempPassword`는 서버가 자동 생성했을 때만, **이 응답 1회에만** 평문으로 담겨 온다(재조회 불가).
- **프론트엔드 연동 요청 사항 (Gemini에게 전달)**:
  1. 강사/직원 등록 폼: 비밀번호 입력을 선택 사항으로 바꾸고(비워두면 자동 발급), 응답의 `tempPassword`가 있으면 **1회성 모달/카드로 노출**(복사 버튼 포함) — 새로고침하면 다시 볼 수 없다는 점을 안내 문구로 명시해주세요.
  2. 로그인 응답(`AuthResponseDto.user.mustChangePassword`)이 `true`면 대시보드로 보내지 말고 **비밀번호 변경 화면으로 강제 이동**시켜주세요(신규 `PATCH /auth/change-password` 연동).
  3. `src/lib/auth-service.ts`(또는 해당 파일)에 `changePassword(currentPassword, newPassword)` 함수 추가 필요.
- **상태**: ✅ 프론트엔드 연동 완료 (2026-09-08 Gemini 반영)


---

### 📅 2026-09-07: 루트(/) 및 로그인(/login) 자동 리다이렉트 해제, 키오스크 토큰 로컬스토리지 잔여 캐시 완전 제거
- **작성자**: Gemini (Frontend)
- **작업 배경**:
  - 기존에는 `localStorage`에 토큰이 남아있으면 루트(`/`)나 로그인(`/login`) 접속 시 강제로 `/dashboard` 또는 `/admin`으로 자동 리다이렉트되어 일반 URL이나 로그인 화면을 직접 볼 수 없고, 공용 기기에서 보안상 취약할 수 있다는 사용자 피드백 반영.
  - 또한 출석 키오스크 탭의 "저장된 키오스크 바로 입장" 버튼 역시 다른 기기에서 재발급 시 무효화된 토큰으로 시도하는 버그 가능성(Claude 제기) 및 토큰 정보 잔류 우려 해소.
- **프론트엔드 반영 사항 (Gemini)**:
  1. **루트 랜딩 페이지 (`src/app/page.tsx`) 자동 리다이렉트 제거**:
     - `isAuthenticated` 시 무조건 `/dashboard`로 튕겨 보내던 `useEffect` 삭제.
     - 메인 랜딩 페이지(`/`)가 항상 온전히 표시되며, 이미 로그인된 경우 상단 헤더에 "대시보드로 이동" 버튼을 노출하여 사용자가 원할 때만 진입하도록 개선.
  2. **로그인 페이지 (`src/app/login/page.tsx`) 자동 리다이렉트 제거 & 활성 세션 제어 배너 탑재**:
     - `/login` 접속 시 자동으로 리다이렉트되던 로직 삭제 ➔ 언제든 로그인 화면 및 키오스크 탭에 직접 접근 가능.
     - 로그인된 상태로 `/login`에 들어올 경우 상단에 `[현재 OOO 계정으로 로그인됨 - 대시보드 | 로그아웃]` 배너를 제공하여 직관적인 제어 지원.
  3. **키오스크 토큰 로컬스토리지 잔여 캐시 완전 제거**:
     - 로그인 화면 진입 시 남아있던 `classhelper_kiosk_token` 자동 클리어 (`removeItem`).
     - "이 기기에 저장된 키오스크 바로 입장" 캐시 카드 삭제 ➔ 토큰이나 전체 링크를 직접 입력하여 안전하게 입장하도록 일원화.
     - `src/app/attendance/page.tsx`에서도 불필요하게 `localStorage`에 키오스크 토큰을 저장하던 구문 제거.
- **빌드 검증**: `yarn frontend:build` 18개 전 라우트 정상 통과 (exit code 0)
- **상태**: ✅ 프론트엔드 반영 및 배포 완료

---

### 📅 2026-09-07: 키오스크 토큰 조회(GET) API 신규 + "재발급 시 다른 기기 캐시가 죽는" 버그 수정
- **작성자**: Claude (Backend) & Gemini (Frontend)
- **버그 배경 (사용자 리포트)**: 폰으로 키오스크(`/kiosk/[token]`)를 켜두고 잘 쓰다가, 관리자 페이지의 "1초 출결 키오스크" 탭을 컴퓨터에서 열었더니 출석 체크가 "등록된 원생을 찾을 수 없습니다"로 실패. 원인은 `kioskToken`이 **학원당 1개뿐**인데, 컴퓨터 브라우저의 `localStorage`에 남아있던 옛(무효화된) 토큰을 검증 없이 그대로 보여주고 있었기 때문. 관리자 페이지에서 키오스크 설정 모달을 여는 것만으로(캐시가 없으면) 조용히 재발급이 일어나 이미 켜져 있던 다른 기기의 토큰이 무효화되는 경우도 동일 버그의 한 형태.
- **변경/추가된 API 엔드포인트**:
  - `GET /attendance/kiosk-token` (SUPER_ADMIN/OWNER/ADMIN, 인증 필요): 재발급 없이 **현재 유효한 토큰**을 조회. 한 번도 발급된 적 없으면 `kioskToken: null`.
  - 기존 `POST /attendance/kiosk-token`(발급/재발급)은 동작 변경 없음.
- **주요 DTO 및 스키마 변경 사항**:
  - `KioskTokenResponseDto.kioskToken`: `string` → `string | null` (조회 응답에서만 null 가능, 발급/재발급 응답은 항상 실제 문자열).
- **프론트엔드 반영 사항**:
  - `src/lib/attendance-service.ts`: `getKioskToken()` 추가, `generateKioskToken()`은 항상 `{ kioskToken: string }`로 유지.
  - `src/app/attendance/page.tsx`: 모달 열 때 `GET /attendance/kiosk-token`으로 서버 현재 값 조회 및 `localStorage` 잔여 토큰 제거.
  - `src/app/login/page.tsx`: 로그인 화면 키오스크 탭에서 로컬 캐시 의존성 완전 제거 및 수동 링크/토큰 입력으로 일원화(Gemini).
- **상태**: ✅ 백엔드 및 프론트엔드 연동 완료

---

### 📅 2026-09-07: 로그인 화면 내 출석 키오스크 / 학원 관리 탭 분리, 로컬 개발 전용 원클릭 로그인 구현 및 미사용 컴포넌트 정리
- **작성자**: Gemini (Frontend)
- **작업 배경**:
  - 로비 태블릿 등에서 출석 키오스크(`kiosk/[token]`)에 진입하기 위해 먼저 로그인하여 1초 출결 체크 화면을 거쳐야 했던 번거로움 해소 요청.
  - 로그인 화면(`/login`) 자체에서 '학원 관리 로그인'과 '출석 키오스크 입장'을 탭으로 손쉽게 전환하여 진입할 수 있는 인터페이스 구축.
  - Claude가 이전 세션에서 DX 개선으로 요청했던 `NODE_ENV === 'development'` 전용 원클릭 빠른 로그인(seed 계정) 탑재 및 미사용 레거시 컴포넌트(`AppNavbar.tsx`) 정리.
- **프론트엔드 반영 사항 (Gemini)**:
  1. **로그인 화면 모드 전환 탭 구축 (`src/app/login/page.tsx`)**:
     - 상단 세그먼트 탭: `[🏢 학원 관리 로그인]` / `[🎒 출석 키오스크 입장 (셀프)]`
     - **학원 관리 로그인 탭**: 기존 원장/강사/관리자 ID & PW 로그인 폼 유지.
     - **출석 키오스크 입장 탭**:
       - 로컬 스토리지(`classhelper_kiosk_token`)에 저장된 토큰이 있는 경우, **"이 기기에 저장된 키오스크 바로 입장"** 카드 및 원클릭 바로가기 버튼 제공.
       - 신규/타 학원 키오스크 토큰 또는 URL 입력 폼(URL 붙여넣기 시 토큰 자동 파싱 추출 지원).
       - 개발 환경(`isDev`)일 때 "데모 학원 키오스크 즉시 실행" 버튼 제공(원장 토큰 자동 발급 연동).
  2. **개발 전용(DEV ONLY) 원클릭 빠른 로그인 버튼 구현 (`src/app/login/page.tsx`)**:
     - `process.env.NODE_ENV === 'development'` 조건 분기: 프로덕션 빌드 시 번들에서 완전 제외(Dead-code elimination).
     - 플랫폼 최고관리자(`admin@classhelper.kr`), 대치본원 김원장(`owner@classhelper.kr`), 목동본원 이원장(`owner2@edustar.kr`) 원클릭 즉시 로그인 지원.
  3. **미사용 데드 코드 정리**:
     - `AppLayout.tsx`로 완전히 대체되어 어디서도 참조되지 않던 `src/components/common/AppNavbar.tsx` 삭제.
- **빌드 검증**: `yarn frontend:build` 18개 전 라우트 정상 통과 (exit code 0)
- **상태**: ✅ 프론트엔드 배포 완료

---

> 📦 **9/6 이전 기록은 [`AI_HANDOFF_ARCHIVE.md`](AI_HANDOFF_ARCHIVE.md)로 옮겨졌습니다** (출석 키오스크 백엔드/풀스크린 프론트 연동, 최고관리자 관제 허브 세분화, 포트 5000 분리, Docker/EC2 배포 인프라 등). 과거 이력이 필요하면 그 파일을 참고하세요.

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
