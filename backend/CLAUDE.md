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

