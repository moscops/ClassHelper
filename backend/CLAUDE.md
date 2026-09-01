# CLAUDE.md (backend)

> Scope: this file only covers `backend/`. It does **not** replace the project ruleset — it depends on it.
> **Read [`../GEMINI.md`](../GEMINI.md) first.** That file is the source of truth for tech stack, multi-tenancy/security rules, coding conventions, git/commit conventions, and the Notion sync requirement. This file exists because Claude Code auto-loads `CLAUDE.md` but not `GEMINI.md` — it's a pointer plus backend-specific history/memory, not a duplicate.

## Non-negotiables (repeated from GEMINI.md because they're easy to violate by accident)
- **Never read, print, or reference `.env`/`.env*` files directly.** Talk about env vars by key name only.
- **Every Prisma query must scope by `academyId`.** No exceptions, including `findFirst`/`update`/`delete`.
- Refresh tokens: bcrypt-hashed only, RTR on `/auth/refresh`, reused/invalid token ⇒ null out the stored hash (force logout).
- Domain/schema/structure changes ⇒ update `backend/docs/domains/*.md` **and** Notion, per GEMINI.md §3/§9. Don't skip this because it's tedious.

## What's actually implemented (verified against `src/` and `prisma/schema.prisma`, 2026-08-31)
Nest modules present: `admin`, `attendance`, `auth`, `class-logs`, `classes`, `common`, `notifications`, `students`, `tuition`, `prisma`.

Prisma models: `Academy`, `User`, `AuditLog`, `Student`, `Class`, `Enrollment`, `Attendance`, `TuitionInvoice`, `TuitionPayment`, `ClassLog`, `HomeworkSubmission`, `Notification`.

**Correction (2026-08-31):** this file previously said `docs/domain-architecture.md` was stale re: Classes/Attendance/ClassLogs status — that was a misattribution on my part. The actually-stale file was `backend/docs/README.md`'s directory-structure block, which marked `classes/`, `attendance/`, `tuition/`, `class-logs/` as "(예정)" and omitted `notifications/` entirely. Fixed both that and the doc-drift below.

**Phase 3-5 (Tuition) shipped this session:** `src/tuition/` implements `TuitionController`/`TuitionService` — invoice generation (bulk, idempotent, ACTIVE-students-only), listing/detail, discount/edit, void, payment recording (overpayment-rejecting), unpaid-list, Kakao reminder (via `NotificationsService`), and monthly revenue stats. Wired into `AppModule`. Tests: `tuition.service.spec.ts`, 22 cases, ~96% line / ~76% branch coverage on the service (controller/DTOs untested, matching this repo's existing convention — `class-logs` has no controller spec either). Endpoint/DTO details documented in `docs/domains/04-billing-and-tuition.md` §4.

**Also reinforced:** `docs/domains/01-auth-and-admin.md` was missing the §4 API spec section that domains 02/03/05 already had (same gap 04 had) — added it, documenting the real `auth`/`admin` controller routes and DTOs.

**Correction (2026-09-01):** this file previously said "No frontend UI yet for `/tuition/*` endpoints" — that was wrong. `frontend/src/app/tuition/page.tsx` (1550 lines) + `frontend/src/lib/tuition-service.ts` (165 lines) already implement the full invoice/payment UI, wired to `AppLayout`. Verified: `yarn frontend:build` succeeds and the `/tuition` route generates cleanly. Also discovered while landing this session's work: a **fourth untracked feature**, `frontend/src/app/calendar/page.tsx` (1231 lines) + `frontend/src/lib/calendar-service.ts` (234 lines) — an academy events calendar + per-day class schedule view. It has **no backend counterpart**; events are stored client-side only (`localStorage`, keyed by `classhelper_events_{academyId}`), not synced through any API. Not previously documented anywhere in this file or `docs/domains/`.

**Frontend nav refactor (in-flight, landed 2026-09-01):** `frontend/src/components/common/AppLayout.tsx` is the actual shared layout now used by every page (`admin`, `attendance`, `class-logs`, `classes`, `dashboard`, `notifications`, `students`, `tuition`) — it embeds its own header/sidebar/nav JSX directly. `frontend/src/components/common/AppNavbar.tsx` also exists (created first, per the prior session's in-flight note) but **is not imported anywhere** — it looks like an earlier draft superseded by `AppLayout.tsx`'s fuller implementation (adds a sidebar) rather than a component `AppLayout` composes. Left in place as dead code since deleting it is a judgment call beyond a docs/lint pass — flagging for a decision: delete, or wire `AppLayout` to actually use it. The same commit also swapped the `bg-dot-vignette` background pattern for `bg-ambient-mesh`/`bg-tech-grid`/`glass-panel`/`interactive-card` utilities (`globals.css`), applied on `login`/`register`/the landing page directly and via `AppLayout` on every authenticated page.

## Roadmap status (GEMINI.md §8, cross-checked against code)
- [x] Phase 0-2 — monorepo setup, Postgres 16 + Prisma 7 schema
- [x] Phase 3-1 — JWT dual-token auth, RBAC, super-admin portal
- [x] Phase 3-2 — Students CRUD + search/filter
- [x] Phase 3-3 — Classes + enrollment mapping
- [x] Phase 3-4 — 1-second attendance check + Kakao/SMS notification engine
- [x] Phase 3-5 — Tuition invoices & payments API (`src/tuition/`)
- [x] Phase 3-6 — ClassLog & Homework domain
- [ ] Phase 4 (next up) — E2E tests, cloud deploy. Tuition frontend UI now exists (see correction below) — remaining known gap before Phase 4: the calendar feature has no backend API.

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

## Maintenance note
Keep this file's "What's actually implemented" and roadmap sections in sync with reality whenever a backend module lands or a phase completes — check it against `src/` and `prisma/schema.prisma` rather than trusting the last write.
