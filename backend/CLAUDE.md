# CLAUDE.md (backend)

> Scope: this file only covers `backend/`. It does **not** replace the project ruleset — it depends on it.
> **Read [`../GEMINI.md`](../GEMINI.md) first.** That file is the source of truth for tech stack, multi-tenancy/security rules, coding conventions, git/commit conventions, and the Notion sync requirement. This file exists because Claude Code auto-loads `CLAUDE.md` but not `GEMINI.md` — it's a pointer plus backend-specific history/memory, not a duplicate.

## Non-negotiables (repeated from GEMINI.md because they're easy to violate by accident)
- **Never read, print, or reference `.env`/`.env*` files directly.** Talk about env vars by key name only.
- **Every Prisma query must scope by `academyId`.** No exceptions, including `findFirst`/`update`/`delete`.
- Refresh tokens: bcrypt-hashed only, RTR on `/auth/refresh`, reused/invalid token ⇒ null out the stored hash (force logout).
- Domain/schema/structure changes ⇒ update `backend/docs/domains/*.md` **and** Notion, per GEMINI.md §3/§9. Don't skip this because it's tedious.
- **Claude & Gemini AI Handoff Protocol (`../AI_HANDOFF.md`)**: Whenever you create or modify backend APIs, DTOs, schemas, or logic, record the changes and frontend integration requirements in [`../AI_HANDOFF.md`](../AI_HANDOFF.md) so Gemini (Frontend) can immediately read and update the frontend.

## What's actually implemented (verified against `src/` and `prisma/schema.prisma`, 2026-09-01)
Nest modules present: `admin`, `attendance`, `auth`, `calendar`, `class-logs`, `classes`, `common`, `notifications`, `students`, `tuition`, `prisma`.

Prisma models: `Academy`, `User`, `AuditLog`, `Student`, `Class`, `Enrollment`, `Attendance`, `TuitionInvoice`, `TuitionPayment`, `ClassLog`, `HomeworkSubmission`, `Notification`, `AcademyEvent`.

**Correction (2026-08-31):** this file previously said `docs/domain-architecture.md` was stale re: Classes/Attendance/ClassLogs status — that was a misattribution on my part. The actually-stale file was `backend/docs/README.md`'s directory-structure block, which marked `classes/`, `attendance/`, `tuition/`, `class-logs/` as "(예정)" and omitted `notifications/` entirely. Fixed both that and the doc-drift below.

**Phase 3-5 (Tuition) shipped this session:** `src/tuition/` implements `TuitionController`/`TuitionService` — invoice generation (bulk, idempotent, ACTIVE-students-only), listing/detail, discount/edit, void, payment recording (overpayment-rejecting), unpaid-list, Kakao reminder (via `NotificationsService`), and monthly revenue stats. Wired into `AppModule`. Tests: `tuition.service.spec.ts`, 22 cases, ~96% line / ~76% branch coverage on the service (controller/DTOs untested, matching this repo's existing convention — `class-logs` has no controller spec either). Endpoint/DTO details documented in `docs/domains/04-billing-and-tuition.md` §4.

**Also reinforced:** `docs/domains/01-auth-and-admin.md` was missing the §4 API spec section that domains 02/03/05 already had (same gap 04 had) — added it, documenting the real `auth`/`admin` controller routes and DTOs.

**Correction (2026-09-01):** this file previously said "No frontend UI yet for `/tuition/*` endpoints" — that was wrong. `frontend/src/app/tuition/page.tsx` (1550 lines) + `frontend/src/lib/tuition-service.ts` (165 lines) already implement the full invoice/payment UI, wired to `AppLayout`. Verified: `yarn frontend:build` succeeds and the `/tuition` route generates cleanly. Also discovered while landing this session's work: a **fourth untracked feature**, `frontend/src/app/calendar/page.tsx` (1231 lines) + `frontend/src/lib/calendar-service.ts` (234 lines) — an academy events calendar + per-day class schedule view. At the time, it had **no backend counterpart**; events were stored client-side only (`localStorage`, keyed by `classhelper_events_{academyId}`), not synced through any API. Not previously documented anywhere in this file or `docs/domains/`. **Closed the same session** — see the entry below.

**Phase: Calendar backend (shipped 2026-09-01):** `src/calendar/` implements `CalendarController`/`CalendarService` — `AcademyEvent` CRUD (`GET/POST /calendar/events`, `PATCH/DELETE /calendar/events/:id`), every query scoped by `academyId`, reads open to all authenticated roles, writes gated to `SUPER_ADMIN`/`OWNER`/`ADMIN`. New Prisma model `AcademyEvent` + `EventCategory`/`EventColor` enums, migration `20260901034633_add_calendar_events`. Wired into `AppModule`. Tests: `calendar.service.spec.ts`, 8 cases covering CRUD + tenancy isolation. `frontend/src/lib/calendar-service.ts` rewired from `localStorage` to real HTTP calls (`api.get/post/patch/delete` against `/calendar/events`), matching `tuition-service.ts`'s pattern; `EventColor` values changed from lowercase to `INDIGO`/`PURPLE`/etc. to match every other backend-mirrored enum in this app, and the already-unused `targetClassIds`/`createdBy` fields were dropped rather than given fake backend support. `frontend/src/app/calendar/page.tsx`'s 4 lowercase-color-literal spots updated to match; no other page structure changed. Endpoint/DTO details in `docs/domains/06-calendar.md`.

The per-day class-schedule half of the calendar page was **already backend-connected** before this change (calls real `classesService.getClasses()` + `GET /classes/:id/enrollments`, joins client-side via `Class.schedule` free-text parsing) — only `AcademyEvent` needed a new domain. Not touched this session: `backend/docs/domain-architecture.md` is separately stale (its "5대 핵심 도메인" section predates `tuition`/`class-logs` entirely, let alone `calendar`) — flagging rather than fixing, since it's a larger unrelated rewrite.

**Feature: bulk student CSV import (shipped 2026-09-01):** added to the existing `students` module (no new module — matches how `tuition`'s bulk-generate lives as just another `TuitionService` method) — `GET /students/bulk-import/template` (downloadable CSV template) and `POST /students/bulk-import` (`multipart/form-data`, field `file`), both `OWNER`/`ADMIN`-only. Accepts Korean (이름/학부모연락처/재원상태/성별/...) or English header names; required columns are name + parentPhone only. Duplicate rows (same academy, same name+parentPhone) are skipped, not overwritten — safe to re-upload. Partial success: invalid rows land in a `failed[]` array with reasons, valid rows still commit. New deps: `multer`, `csv-parse`, `csv-stringify` (first file-upload code in this backend — no `MulterModule` registration existed anywhere before this). Tests: 12 new cases across `students.service.spec.ts`/`students.controller.spec.ts` (full suite now 99). Docs: `docs/domains/02-students-and-classes.md` §4. Logged in `../AI_HANDOFF.md` for Gemini to build the upload wizard against.

**Frontend nav refactor (in-flight, landed 2026-09-01):** `frontend/src/components/common/AppLayout.tsx` is the actual shared layout now used by every page (`admin`, `attendance`, `class-logs`, `classes`, `dashboard`, `notifications`, `students`, `tuition`) — it embeds its own header/sidebar/nav JSX directly. `frontend/src/components/common/AppNavbar.tsx` also exists (created first, per the prior session's in-flight note) but **is not imported anywhere** — it looks like an earlier draft superseded by `AppLayout.tsx`'s fuller implementation (adds a sidebar) rather than a component `AppLayout` composes. Left in place as dead code since deleting it is a judgment call beyond a docs/lint pass — flagging for a decision: delete, or wire `AppLayout` to actually use it. The same commit also swapped the `bg-dot-vignette` background pattern for `bg-ambient-mesh`/`bg-tech-grid`/`glass-panel`/`interactive-card` utilities (`globals.css`), applied on `login`/`register`/the landing page directly and via `AppLayout` on every authenticated page.

**Feature: plan/subscription model (shipped 2026-09-01):** platform's own monetization layer — new `Subscription` model + `PlanTier` (`FREE`/`PRO`/`ENTERPRISE`) / `SubscriptionStatus` (`ACTIVE`/`CANCELED`) enums, singleton per academy (`academyId @unique`), migration `20260901062022_add_subscriptions`. Every new academy gets a `FREE` subscription automatically (added inside `registerOwner`'s existing transaction in `auth.service.ts`). Management via the existing `admin` module (no new module, matches its "SUPER_ADMIN manages academy platform attributes" scope): `PATCH /admin/academies/:id/subscription`, using `upsert` (not `update`) since pre-existing academies have no subscription row yet — treated as `FREE`/`ACTIVE` at the application layer rather than backfilled via SQL. Self-view: `GET /auth/me` (and login/register responses) now include `academy.subscription`. Deliberately **not built**: actual payment processing (next up — the payment-gateway ticket) and limit enforcement (reference-only `PLAN_LIMITS` constant in `common/constants/`, nothing checks it yet). Tests: `admin.service.spec.ts` created fresh (module had zero tests before), 4 cases; `auth.service.spec.ts` extended. Full suite: 103. Docs: `docs/domains/01-auth-and-admin.md` new §1.4 entity + §2 role-matrix rows + §4.10.5 API spec.

**Feature: student report (리포트) (shipped 2026-09-01):** new `reports` module (orchestrator, no own Prisma model) — `GET /reports/students/:id` (preview), `POST /reports/students/:id/send`, `POST /reports/classes/:id/send`, all `SUPER_ADMIN/OWNER/ADMIN/TEACHER`. Reuses existing domain logic rather than duplicating it: new sibling methods `AttendanceService.getStudentAttendanceStats()` and `ClassLogsService.getStudentHomeworkStats()` (both period-scoped, added alongside the existing all-time/per-academy versions), sent via the existing `NotificationsService.createNotification(..., channel: KAKAO)` — same DB-only "send" every other Kakao message in this app already uses (no real Kakao API integration exists anywhere in this repo). New `NotificationType.STUDENT_REPORT` enum value (migration `20260901064302_add_student_report_notification_type`). Per user's explicit scope choice: Kakao only for now (email deferred), manual trigger only (no `@nestjs/schedule`/cron — doesn't exist in this backend yet). Class-level send is partial-success (one student's failure doesn't block the rest), matching bulk-import's philosophy. Tests: `reports.service.spec.ts` new, 6 cases; full suite 109. Docs: `docs/domains/07-reports.md`.

**Feature: 출석 키오스크 (전화번호 뒷자리 셀프 체크인) (shipped 2026-09-06):** 기존 `attendance` 모듈에 추가 (새 모듈 아님) — 학원 로비 태블릿에서 학생이 로그인 없이 전화번호 뒷자리 4자리를 입력해 등/하원을 체크. 신규 비인증 컨트롤러 `AttendanceKioskController` (`/attendance/kiosk/lookup`, `/attendance/kiosk/check-in`) — 클래스 레벨 `@UseGuards(JwtAuthGuard, RolesGuard)`가 걸린 기존 `AttendanceController`와 분리해 별도 파일로 구성. 학원 식별은 신규 `Academy.kioskToken`(32바이트 hex, 마이그레이션 `20260906070000_add_academy_kiosk_token`)으로, 발급/재발급은 `POST /attendance/kiosk-token`(OWNER/ADMIN). 식별 우선순위는 `studentPhone` 우선, 없으면 `parentPhone` 뒷자리 대체(사용자 확정 사양). 수업 자동 매칭은 `Class.schedule` 자유 텍스트에서 오늘 요일 글자 포함 여부로 필터링, 매칭 없으면 전체 반환. 브루트포스 방지는 `/auth/login`과 동일한 `@Throttle`(60초 5회/10회). 체크인 로직은 기존 `quickCheck()`를 그대로 재사용(중복 구현 없음). 테스트: `attendance.service.spec.ts`에 19개 케이스 추가(전체 스위트 119). 문서: `docs/domains/03-attendance-and-notifications.md` §4.8. **프론트 키오스크 화면(`/kiosk/[token]`)은 미구현** — `AI_HANDOFF.md`에 Gemini용 스펙 전달 완료.

**Fix: 키오스크 토큰 조회(GET) API 신규 + 캐시 무효화 버그 수정 (2026-09-07):** 사용자 리포트 — 폰으로 켜둔 키오스크가 정상 동작 중인데 관리자 페이지의 키오스크 모달을 컴퓨터에서 열었더니 "학생을 찾을 수 없음" 오류. 원인은 `kioskToken`이 학원당 1개뿐인데 프론트(`attendance/page.tsx`)가 모달을 열 때 `localStorage` 캐시를 검증 없이 신뢰했던 것 — 다른 기기에서 재발급(POST)이 일어나면 그 캐시는 즉시 무효화된 값이 되고, 심지어 캐시가 없는 기기에서 모달을 열기만 해도 자동으로 재발급이 트리거되어 이미 켜져 있던 다른 기기의 토큰까지 무효화시켰다. `AttendanceService.getKioskToken()` + `GET /attendance/kiosk-token`(SUPER_ADMIN/OWNER/ADMIN) 신규 추가 — 재발급 없이 현재 값만 조회(`KioskTokenResponseDto.kioskToken`을 `string | null`로 완화, 미발급 시 null). `handleOpenKioskModal`을 이 GET으로 서버 값을 먼저 확인하도록 수정(토큰이 없을 때만 발급). 프론트 변경까지 이번엔 Claude가 직접 처리(백엔드 API와 강결합이라 예외적으로) — 단, 같은 날 Gemini가 추가한 로그인 페이지의 "저장된 키오스크 바로 입장" 버튼도 동일한 버그 패턴을 갖고 있어 `AI_HANDOFF.md`에 Gemini 확인 요청으로 남겨둠(직접 수정 안 함, 로그인 페이지는 Gemini 영역). 테스트: `attendance.service.spec.ts`에 2개 케이스 추가(전체 스위트 122). 문서: `docs/domains/03-attendance-and-notifications.md` §4.8에 조회 API 섹션 추가.

**Feature: 강사/직원 등록 시 임시 비밀번호 자동 발급 (2026-09-07):** 사용자 설계 질문 — 강사/실장/조교 로그인이 원장 동의(직접 계정 생성)를 거쳐야 하는 현재 방식을 유지할지, 셀프가입+승인으로 바꿀지. 이미 구현된 `POST /auth/register-staff`(원장/ADMIN 전용, JWT 인증) 방식이 이미 A안이라는 걸 확인하고 그대로 유지 — 셀프가입 플로우는 로드맵상 "학원코드 승인"으로 이미 후순위 연기돼 있어 지금 새로 안 만듦. 대신 UX만 개선: `RegisterStaffDto.password`를 선택으로 바꾸고 생략 시 정책 준수(영문+숫자+특수문자 8자+) 임시 비밀번호를 서버가 자동 생성(`AuthService.generateTempPassword()`, `crypto.randomInt` 기반, 문자군 최소 1개씩 보장). `User.mustChangePassword`(신규 컬럼, 마이그레이션 `20260907080000_add_must_change_password`) — 원장이 대신 만든 계정은 비밀번호를 직접 지정했든 자동 생성했든 항상 `true`로 시작, `PATCH /auth/change-password`(신규, 전 역할 공통, `/auth/login`과 동일 Throttle) 성공 시 해제. `register-staff` 응답은 `StaffRegisteredResponseDto`(`UserProfileDto` + 자동 생성 시에만 채워지는 `tempPassword`, 1회성) — `UserProfileDto`에도 `mustChangePassword`를 추가해 로그인/`GET /auth/me` 응답에 항상 실림. **이 세션은 Prisma 마이그레이션을 실제 DB에 적용하지 못함** — 샌드박스에 docker/DB 접근 권한이 없어 `migration.sql`을 기존 파일 스타일대로 수기 작성만 했고 `prisma generate`(스키마만 읽음, DB 불필요)로 타입만 갱신함. `prisma migrate deploy`는 배포 시 `Dockerfile` CMD가 자동 실행하므로 다음 배포 때 반영되지만, 로컬 dev DB는 별도로 `migrate deploy`를 돌려야 함. 테스트: `auth.service.spec.ts`에 5개 케이스 추가(전체 스위트 127). 문서: `docs/domains/01-auth-and-admin.md` §2, §4.2, §4.2.1(신규). `AI_HANDOFF.md`에 Gemini용 프론트 연동 스펙(임시 비밀번호 1회 노출 UI, `mustChangePassword` 시 강제 리다이렉트, 비밀번호 변경 폼) 전달 완료.

**Feature: 교직원 관리 실제 백엔드 구현 + 학원코드 자가입 + 권한상승 취약점 수정 (2026-09-08):** 사용자가 "교직원 관리 페이지에서 원장 본인도 현재 비밀번호 없이 비번 초기화가 된다"고 리포트하며 요청 — 코드 확인 결과 **`GET/PATCH/DELETE /auth/staff/*`가 백엔드에 전혀 존재하지 않았음**을 발견. 프론트(`staff-service.ts`)는 이 엔드포인트들을 호출하고 실패하면 `catch`로 조용히 무시한 뒤 `localStorage` 목업 데이터로 폴백하며 가짜 "성공" 메시지를 보여주도록 짜여 있었다 — 즉 사용자가 겪은 문제는 보안 결함이 아니라 기능 전체가 프론트 전용 목업이었던 것. `superpowers:brainstorming` 스킬로 설계 확정 후 진행:
- **교직원 관리 실제 구현** (`src/auth/*`, 기존 모듈): `GET /auth/staff`(목록, `academyId` 스코프, 기본 재직만), `PATCH /auth/staff/:id`(수정), `PATCH /auth/staff/:id/password`(관리자發 초기화 — **대상이 OWNER/ADMIN이면 서버가 실제로 403 거부**, 프론트 버튼 숨김에 의존하지 않음), `DELETE /auth/staff/:id`(퇴사 처리) 신규.
- **하드 삭제 대신 소프트 삭제**: `User.status`(`UserStatus`: `ACTIVE`/`INACTIVE`, 신규 enum) 추가. `ClassLog.teacher` 등 다수 관계가 `onDelete: Cascade`라 실제로 유저를 지우면 그 교직원이 남긴 수업일지/결제이력이 함께 삭제되는 사고가 나기 때문 — `Student.status` 패턴과 동일. `INACTIVE`는 로그인 차단(`AuthService.login`에 체크 추가, 자격증명 불일치와 동일 메시지로 계정 상태 유추 방지).
- **권한상승 취약점 수정**: `RegisterStaffDto.role`이 `@IsEnum(UserRole)`라서 실장(ADMIN)이 `role: "OWNER"`나 `"SUPER_ADMIN"`을 넣어 자기 자신을 승격시킬 수 있었음 — `@IsIn([ADMIN, TEACHER, STAFF])`로 제한. 신규 `UpdateStaffDto.role`/`JoinStaffDto.role`도 동일하게 방어(자가입은 TEACHER/STAFF만 가능, ADMIN도 제외).
- **학원코드 자가입** (사용자 요청 3번): `Academy.staffJoinCode`(신규, `kioskToken`과 동일 패턴) — `POST/GET /auth/staff-join-code`(발급·재발급/조회, OWNER·ADMIN)로 관리, `POST /auth/join-staff`(비인증, `/auth/login`과 동일 Throttle)로 강사/조교가 코드만으로 **승인 절차 없이 즉시** 자가입하고 바로 로그인 상태(토큰 발급)로 진입. 기존 `POST /auth/register-staff`(원장 직접 등록)는 병행 유지(사용자 확정 사양). 자가입 계정은 본인이 비밀번호를 정하므로 `mustChangePassword=false`로 시작(원장 대신 등록 시의 `true`와 대비).
- **이 세션도 Prisma 마이그레이션을 실제 DB에 적용하지 못함** — 샌드박스에 docker 접근 권한 없음(9/7 세션과 동일 제약). `migration.sql`(`20260908050000_add_staff_management`)을 기존 파일 스타일로 수기 작성, `prisma generate`(DB 불필요)로 타입만 갱신. 배포 시 `Dockerfile` CMD가 `migrate deploy`를 자동 실행하지만 로컬 dev DB는 별도 반영 필요.
- 테스트: `auth.service.spec.ts`에 18개 케이스 추가(전체 스위트 145). 문서: `docs/domains/01-auth-and-admin.md` §1(엔티티), §2(권한 매트릭스 — ADMIN도 강사/직원 등록 가능하다는 기존 오기도 함께 수정), §4.2.2~4.2.8(신규), §4.3(로그인 INACTIVE 거부 추가).
- **프론트는 사용자가 직접("이 내용대로 수정하고 프론트 작업 시작할게") 진행** — `AI_HANDOFF.md`에 전체 엔드포인트/DTO 스펙과 함께 `staff-service.ts`의 모든 `localStorage`/mock 폴백 제거 필요성, "보안 관리" 사이드바 탭 신설 요청, 자가입 화면 UX 스펙을 전달.

**Fix: `updateStaff`↔`resetStaffPassword` 동료 실장 계정 탈취 체인 (2026-09-08, 백엔드+프론트 커밋 직후 `/security-review`에서 발견):** 위 교직원 관리 기능이 이미 커밋(`438c418`)된 직후 사용자가 보안 점검을 요청, 서브에이전트가 실제 공격 경로를 찾음 — `resetStaffPassword`는 대상이 `OWNER`/`ADMIN`이면 거부하지만, `updateStaff`는 대상이 `OWNER`일 때만 거부하고 `ADMIN`은 막지 않았음. 그 결과 실장 A가 동료 실장 B를 `PATCH /auth/staff/:id`(`role: "TEACHER"`)로 먼저 강등시킨 뒤 곧바로 `PATCH /auth/staff/:id/password`를 호출하면 방금 걸었던 방어(OWNER/ADMIN 대상 거부)를 우회해 B의 비밀번호를 초기화하고 강제 로그아웃시킬 수 있었음(동료 계정 탈취, 학원당 실장이 2명 이상인 정상적인 구성에서 발생 가능). `updateStaff`에 "대상이 ADMIN이고 `role` 필드를 바꾸려는 요청이면 요청자가 OWNER가 아닐 때 403" 체크 추가로 차단(이름/연락처만 바꾸는 건 실장끼리도 허용, `role` 필드 변경만 원장 전용으로 제한). 테스트 3개 추가(전체 스위트 148). 문서: `docs/domains/01-auth-and-admin.md` §4.2.3. 커밋 `b392b9d`(아래 방문 통계 로그인 훅과 같은 파일이라 함께 커밋됨).

**Feature: 사이트 방문 통계(Site Visit Analytics) (2026-09-08):** 사용자 요청 — "날짜 기준으로 몇 명이 방문했는지 확인하는 메뉴", 이어서 "로그인/회원가입/학원개설 수도 함께" 확장. `superpowers:brainstorming`→`writing-plans`→`executing-plans` 전체 플로우로 진행(스펙: `docs/superpowers/specs/2026-09-08-site-visit-analytics-design.md`, 플랜: `docs/superpowers/plans/2026-09-08-site-visit-analytics.md`). 신규 `analytics` 모듈: `POST /analytics/track`(비인증, 익명 UUID beacon) + `GET /analytics/stats`(SUPER_ADMIN, 날짜별 4개 카테고리). 핵심 설계: 신규 `SiteVisit` 테이블은 방문(비로그인/로그인)만 추적하고, **회원가입/학원개설 수는 기존 `User.createdAt`/`Academy.createdAt`을 집계해 새 테이블 없이 구현**. `AuthService.login()`에 방문 기록 훅 추가(실패해도 로그인은 절대 안 막힘, try/catch). TDD 중 UTC 타임존 버그 발견 및 수정(`new Date('YYYY-MM-DD')`는 UTC 자정 파싱인데 로컬 `setHours(0,0,0,0)`을 섞으면 서버 타임존에 따라 날짜가 하루 밀림 — 전부 UTC로 통일). 마이그레이션 `20260908060000_add_site_visits`, 로컬 dev DB에도 실제 적용 확인. 테스트: `analytics.service.spec.ts` 신규 5개 + `auth.service.spec.ts` 2개 추가(전체 스위트 155). 문서: `docs/domains/08-analytics.md` 신규.

**⚠️ 발견: 프론트가 이미 다른 계약으로 "사이트 방문자 분석" 화면을 구현해둠** — 같은 세션 중 프론트(`admin/page.tsx`, `admin-service.ts`)가 독립적으로 `GET /admin/visitors`를 호출하는 훨씬 풍부한 화면(PV, 신규/재방문 비율, 기기별(PC/모바일/태블릿) 비율, 일자별 최다 이용 서비스)을 이미 만들어뒀고, 엔드포인트가 없어 지금은 전부 가짜 목업 데이터(`generateMockVisitorData()`)로 채워져 있음. 이 세션에서 구현한 `/analytics/stats`와는 경로도 응답 형태도 다름 — 프론트가 원하는 기기 추적은 User-Agent 저장이 필요한데 이번 설계는 PII 최소화를 위해 의도적으로 저장 안 함, "최다 이용 서비스"는 완전히 별개의 기능 사용량 분석 도메인. 두 설계를 어떻게 합칠지 사용자에게 보고, 결정 대기 중 — `docs/domains/08-analytics.md` §5에 표로 정리, `AI_HANDOFF.md`에도 경고와 함께 기록해 다음 세션이 프론트를 임의로 덮어쓰지 않도록 함.

## Roadmap status (GEMINI.md §8, cross-checked against code)
- [x] Phase 0-2 — monorepo setup, Postgres 16 + Prisma 7 schema
- [x] Phase 3-1 — JWT dual-token auth, RBAC, super-admin portal
- [x] Phase 3-2 — Students CRUD + search/filter
- [x] Phase 3-3 — Classes + enrollment mapping
- [x] Phase 3-4 — 1-second attendance check + Kakao/SMS notification engine
- [x] Phase 3-5 — Tuition invoices & payments API (`src/tuition/`)
- [x] Phase 3-6 — ClassLog & Homework domain
- [ ] Phase 4 (next up) — E2E tests, cloud deploy. Tuition frontend UI and calendar backend both now exist (see corrections below) — no known frontend/backend connectivity gaps remain going into Phase 4.

## Backend-relevant commit history (oldest → newest)
```
2a22dbc refactor: 모노레포로 구성 변경
4cfe9ac feature: authorization domain established && swagger api established
82cddf6 feat: init migration created
1d5d3a6 feat: access/refresh token usage && schema updated
1015053 migrate: hashed_refresh_token
97cab1f feat: password procedure's security enhanced
8b03739 migration&&decorator: super_admin added
b882b40 docs: current domains description
526ff40 feat: seed data && super_admin page
9157b27 feat: class & students manage page
cbf30db feat(backend/attendance): 1초 출결 체크 및 일괄 출결 엔진 API (#2)
0d975e5 feat(ci): GitHub Actions CI/CD, lint/build env optimization
a57cff7 feat(attendance/notifications): 미등원 자동 카톡 발송, 1초 출결 긴급 신호, 알림 센터
3469219 feat(fullstack/class-logs): 수업 일지 및 과제 관리 도메인 구현 (Phase 3-6)
```

## Landed 2026-09-01 (was: in-flight work as of 2026-08-31)
The frontend nav refactor flagged as in-flight last session is now committed. See the "Frontend nav refactor" correction above for what actually shipped (`AppLayout.tsx`, not `AppNavbar.tsx`) and the `AppNavbar.tsx`/background-pattern caveats. No backend changes were involved.

## Landed 2026-09-04: CI/CD 자동배포 파이프라인 + S3 DB 백업 + AI_HANDOFF 아카이빙

**배경**: 9/3 첫 배포 이후, EC2에서 매번 SSH로 수동 빌드/배포하던 걸 완전 자동화하고, DB 백업과
handoff 문서 관리 체계를 갖춘 세션. 코드 기능 추가 없이 전부 인프라/운영 작업.

**1. S3 DB 백업 자동화**: EC2 IAM 인스턴스 프로파일(`ClassHelperEC2BackupRole`, 버킷 하나로
스코프 제한, `.env`에 액세스키 없음) → `~/scripts/backup-db.sh`(EC2에만 존재, repo 미포함) →
`docker exec` pg_dump → gzip → `aws s3 cp` → `classhelper-db-backups-054221782451-ap-northeast-2-an`
버킷, `db-backups/` 프리픽스, 30일 수명주기 만료. cron `0 18 * * *`(UTC) = 매일 03:00 KST
(EC2 호스트 시계는 UTC라 주의 — Postgres 컨테이너 자체는 `TZ: Asia/Seoul`).

**2. P1(시드 데이터) 완료**: `prisma/seed.ts`는 이미 `admin@classhelper.kr`(SUPER_ADMIN)/
`owner@classhelper.kr`(OWNER, 둘 다 비번 `password123!`)를 만들도록 되어있었음 — 진짜 문제는
배포된 EC2 DB에 seed가 한 번도 실행된 적이 없었던 것. `backend/Dockerfile`의 컨테이너 시작
CMD에 `yarn prisma:seed`를 migrate 다음/서버 기동 전에 추가(전부 upsert라 반복 실행 안전)해서
매 배포마다 자동 보장되도록 함. P2~P4(교직원 API, 학원코드 승인, 공지/메모, 벌크 배정, 아이디/비번
찾기)는 결제 게이트웨이/카카오 실 API 연동 이후로 순서 조정, 아직 미착수 — 상세 스펙은
[`../AI_HANDOFF.md`](../AI_HANDOFF.md) 참고.

**3. GitHub Actions CI/CD 자동배포 구축** — `dev` push → 자동으로 EC2까지 반영:
- `.github/workflows/docker-publish.yml`(워크플로 이름은 `CD Pipeline`) 신규: backend-ci/frontend-ci
  (lint/test/build) 게이트를 통과해야만(`needs:`) backend/frontend 이미지를 빌드해
  `ghcr.io/moscops/classhelper-{backend,frontend}:latest` + `:<sha>`로 푸시.
- `docker-compose.prod.yml`: `build:` → `image: ghcr.io/...`로 전환, `watchtower` 서비스 추가
  (60초 간격 폴링, backend/frontend만 감시 대상). EC2는 더 이상 이미지를 직접 빌드하지 않음 —
  `next build` OOM용 스왑파일 워크어라운드가 배포 경로에서 완전히 사라짐.
- `backend/Dockerfile`: CMD가 `prisma migrate deploy && prisma seed && node dist/src/main.js` 순서로
  실행되도록 변경(마이그레이션/시드 자동 반영, 수동 `exec` 불필요).
- 미사용 `.github/workflows/cd.yml`(예전 "CD Pipeline (Release & Deploy)", main push 전용이라
  브랜치 전략 변경 후 실행 0건이던 죽은 워크플로, 실제 배포 기능도 없었음) 삭제.

**겪은 트러블슈팅 5건** (인스턴스/저장소 재구성 시 다시 겪을 수 있어 기록):
1. `ghcr.io` push 시 `permission_denied: installation does not exist` — 저장소가 실제로는
   `moscops`로 이전됐는데(`JoshyWoshy1212`는 리다이렉트만) 워크플로에 옛 소유자를 하드코딩했던 게
   원인. `${{ github.repository_owner }}`로 교체.
2. `moscops` 조직이 ghcr.io 패키지 Public 전환을 정책으로 차단 — private 유지, EC2에서
   `docker login ghcr.io`(PAT, `read:packages` scope, `root`로 로그인) 1회 필요.
3. watchtower가 `client version 1.25 too old` 크래시 반복 — 이미지 내장 도커 클라이언트 버전이
   EC2 실제 도커 데몬(API 1.55)보다 낮아서. `DOCKER_API_VERSION` env로 강제 지정해 해결.
4. watchtower가 private 이미지 pull 시 `403 Forbidden`/`unauthorized` — docker socket을 마운트해도
   host의 `docker login` 인증정보를 자동으로 물려받지 않음(별개 프로세스). watchtower 컨테이너에
   `/root/.docker/config.json:/config.json:ro`를 직접 마운트해야 함.
5. **CI가 배포를 막지 못하던 결함 2단계로 발견/수정**: 처음엔 `docker-publish.yml`이 `push`에
   독립적으로 반응해서 CI 실패와 무관하게 배포가 진행됨 → `workflow_run`(ci.yml 완료 시 트리거)으로
   1차 수정했으나, `workflow_run`은 트리거하는 워크플로 파일이 저장소 **기본 브랜치**에도 있어야
   실제로 발동하는데 이 저장소 기본 브랜치는 아직 `main`(`dev`보다 53커밋 뒤처짐)이라 전혀 발동 안 함
   (실행 0건으로 확인). 최종적으로 backend-ci/frontend-ci를 `docker-publish.yml` 안에 자체적으로
   넣고 `needs:`로 이미지 빌드 job을 의존시키는 방식으로 재구성 — 기본 브랜치 문제와 무관하게 항상
   정상 동작. `push`가 거의 동시에 여러 번 오면 오래된 커밋의 빌드가 `:latest`를 나중에 덮어쓸 수
   있어 `concurrency`(`cancel-in-progress: false`)로 순차 실행도 함께 보장.

**4. `AI_HANDOFF.md` 아카이빙 구조 도입**: 394줄까지 쌓여서 매 세션 읽는 비용이 커지던 문제 예방—
`AI_HANDOFF_ARCHIVE.md` 신규 생성, 9/1~9/2 지난 항목 17개를 내용 변경 없이 이동. `AI_HANDOFF.md`는
이제 당일 항목만 유지, 헤더에 "날짜 지나면 archive로 이동" 규칙 명시(Gemini도 동일 규칙).

**의도적으로 미룬 것**: AWS Secrets Manager(결제 게이트웨이 + 카카오 실 API 연동 이후로 재차 연기 —
두 기능 다 새 시크릿을 추가하므로 시크릿 목록이 확정된 뒤 한 번에 전환하는 게 효율적이라는 판단),
도메인/HTTPS(classhelper.co.kr이 Gabia에서 아직 lame delegation 상태로 DNS 미해결).

## Maintenance note
Keep this file's "What's actually implemented" and roadmap sections in sync with reality whenever a backend module lands or a phase completes — check it against `src/` and `prisma/schema.prisma` rather than trusting the last write.

