# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Staff of Korean private academies (학원). Two working situations, confirmed 2026-09-21:

- **Instructors (강사) in the classroom.** They record attendance during class, standing, on a phone. The job is to mark each student present, absent, late, or leaving early in one touch, without breaking the flow of teaching.
- **Owners (원장) and managers (부원장/실장) at a desk.** They work on a large monitor or a laptop (about 1280px wide). The jobs are managing students and classes, watching attendance, tracking tuition and unpaid invoices, and reading class logs for parent consultations.

Other roles in the product: staff/assistants (직원/조교) and a platform administrator (SUPER_ADMIN) who oversees all academies.

## Product Purpose

ClassHelper is an all-in-one management system for academies: students and classes, attendance, tuition billing and unpaid tracking, and class logs with homework. It exists so teachers and owners can replace paperwork and spreadsheets and spend their time on teaching. Success is an instructor recording a class's attendance in seconds, and an owner seeing who has not paid without assembling it by hand.

## Positioning

The owner named four strengths a neighboring academy tool could not truthfully copy as a bundle:

1. One-touch attendance during class ("1초 출결 체크").
2. Automatic KakaoTalk notification (알림톡) to parents.
3. Automatic tracking of tuition payments and unpaid invoices.
4. Class logs that accumulate into feedback for parent consultations.

Attendance is the lead promise in the README and the current UI copy.

## Operating Context

- Attendance is recorded per class and per day, in a classroom, by one person handling a group of students.
- Owners review students, unpaid tuition, and attendance statistics at a desk, monthly and daily.
- Parents are contacted by phone and KakaoTalk; parent phone numbers are first-class data.
- Everyday work is Korean-language, with role titles and status vocabulary (재원/휴원/퇴원, 출석/결석/지각/조퇴).

## Capabilities and Constraints

- Backend is built: students and classes with enrollments, attendance, tuition and payments, class logs and homework, reports, bulk import, subscriptions.
- Frontend screens exist for: landing, login, owner sign-up, dashboard, students, classes, attendance, and the platform-admin portal. Tuition, class logs, and homework screens are not built yet.
- KakaoTalk notification sending is not integrated with a real API yet. The payment gateway is a deferred ticket.
- Devices in use, confirmed: desktop monitor, laptop (about 1280px), smartphone. Tablet use in the classroom was not confirmed; treat it as undecided.
- Frontend stack: Next.js (App Router), React, Tailwind CSS v4, TypeScript. The frontend has also been edited by another AI assistant in parallel; frontend changes here go through the `claude/project-css-ui-styling-ad61fd` branch.
- Roles and labels must stay consistent across pages: OWNER 원장님, ADMIN 부원장/실장, TEACHER 강사, STAFF 직원/조교, SUPER_ADMIN 플랫폼 관리자.

## Brand Commitments

- Name: ClassHelper. Interface language: Korean, formal register aimed at academy staff.
- Brand color: indigo, kept by the owner's explicit choice on 2026-09-21 ("Indigo 유지 + 정돈").

## Evidence on Hand

- No real customers, testimonials, case studies, or pricing exist in the repository. Do not invent any.
- All screens have been reviewed only with synthetic demo data (invented names and phone numbers).
- Backend documentation lives in `backend/docs/` (domain docs `01`-`05`).

## Product Principles

1. Speed in the classroom beats richness: the attendance path stays one touch and thumb-reachable on a phone.
2. Owners decide from an overview: money owed, absences, and student status are visible without digging.
3. Say the state plainly: statuses and roles use the same words on every screen.
4. Copy is factual: only promise what the product does today; unbuilt features say so plainly ("준비 중").
5. Two very different postures share one product (standing with a phone vs. sitting at a monitor): design for both, do not average them.

## Accessibility & Inclusion

Target: WCAG 2.1 AA for text contrast, names on controls, landmarks, and keyboard operation. Adopted 2026-09-21 after an axe-core audit; the audited screens are at zero violations except items listed as open. Open items: focus management and focus trapping in modals, and combobox semantics for the custom dropdowns.
