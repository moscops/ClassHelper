# 역할별 커스텀 권한 (Role Permissions) — 설계 문서

- 작성일: 2026-09-08
- 작성자: Claude (Backend)
- 상태: 설계 확정, 구현 대기

## 1. 배경 및 목적

원장(OWNER)이 실장(ADMIN)/강사(TEACHER)/조교(STAFF) 각 역할이 메뉴별로 "수정"할 수 있는지를 직접 커스텀할 수 있게 한다. 초기 기본값은 이 문서에서 정하고(사용자가 위임), 이후 원장이 교직원 관리 탭의 "권한 설정" 버튼에서 언제든 변경할 수 있다.

## 2. 범위 및 핵심 제약

**대상 역할**: `ADMIN`/`TEACHER`/`STAFF`만. `OWNER`/`SUPER_ADMIN`은 항상 전권 — 토글 대상 아님.

**"보기"는 건드리지 않는다**: 이 시스템은 어떤 역할이 아예 접근 불가능한 메뉴(현재 `@Roles()`로 걸려 있음, 예: `TEACHER`는 `tuition` 엔드포인트 전체에 `@Roles()` 자체가 없어 접근 불가)를 열어주지 않는다. **오직 이미 라우트에 접근 가능한 역할의 "수정" 여부만** 추가로 좁힌다 — 기존 `@Roles()`가 여전히 상한선(ceiling)이고, 이 기능은 그 안에서만 작동하는 하위 게이트다. 실수로 권한이 넓어지는 사고를 막기 위한 설계 원칙.

**대상 메뉴(8개, `PermissionModule` enum)**: `STUDENTS`(원생관리), `CLASSES`(반관리), `ATTENDANCE`(출결), `CLASS_LOGS`(수업일지·과제), `TUITION`(수강료), `CALENDAR`(캘린더), `NOTIFICATIONS`(알림 — 단, 아래 §5 참고로 일부 액션만), `REPORTS`(리포트 발송).

**제외 (토글 대상 아님, 지금처럼 고정)**: 교직원 관리(`auth`의 `staff/*` 엔드포인트) 자체와 학원코드/비밀번호 관련 기능, 관리자 감사로그·구독 등 `admin` 모듈 전체. 권한을 다루는 기능 자체를 토글 가능하게 하면 실장이 자기 권한을 스스로 넓히는 등 꼬일 여지가 있어 제외.

## 3. 데이터 모델

```prisma
enum PermissionModule {
  STUDENTS
  CLASSES
  ATTENDANCE
  CLASS_LOGS
  TUITION
  CALENDAR
  NOTIFICATIONS
  REPORTS
}

model RolePermission {
  id        Int               @id @default(autoincrement())
  academyId Int
  role      UserRole          // 애플리케이션 레벨에서 ADMIN/TEACHER/STAFF만 허용(DTO에서 강제)
  module    PermissionModule
  canEdit   Boolean           @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  academy Academy @relation(fields: [academyId], references: [id], onDelete: Cascade)

  @@unique([academyId, role, module])
  @@index([academyId])
  @@map("role_permissions")
}
```

`Academy`에 `rolePermissions RolePermission[]` 백 릴레이션 추가.

**지연 기본값(lazy fallback) 방식**: 학원 생성 시 24개(3역할×8메뉴) 행을 미리 만들지 않는다. 조회 시 `RolePermission` 행이 없으면 아래 §4 하드코딩된 기본값 맵으로 대체한다. 원장이 설정 화면에서 저장하면 그때 실제로 바뀐 조합만 upsert된다. 장점: 기존 학원에 백필 불필요, "기본값으로 초기화"가 단순히 행 삭제로 구현됨.

## 4. 기본값 (Claude가 정함, 실제 기존 `@Roles()` 패턴을 근거로 도출)

| 메뉴 | ADMIN | TEACHER | STAFF | 근거 |
| :--- | :---: | :---: | :---: | :--- |
| STUDENTS | 수정 | 보기 | 보기 | 원생정보 수정은 관리 업무 |
| CLASSES | 수정 | 보기 | 보기 | 반 편성은 관리 업무 |
| ATTENDANCE | 수정 | **수정** | **수정** | 출결 체크는 강사·조교 공통 본연 업무(`attendance record/batch/quick-check`는 현재도 `TEACHER`·`STAFF` 둘 다 이미 `@Roles()`에 포함되어 있음 — 실사용 확인됨) |
| CLASS_LOGS | 수정 | **수정** | 보기(현재 STAFF는 `@Roles()`에서 이미 제외라 이 값은 사실상 무의미) | 수업일지 작성은 강사 본연 업무 |
| TUITION | 수정 | 보기(현재 TEACHER도 `@Roles()`에서 이미 제외라 이 값은 사실상 무의미) | 보기(동일) | 수납은 관리 업무 |
| CALENDAR | 수정 | 보기 | 보기 | 학원 일정 등록은 관리 업무 |
| NOTIFICATIONS | 수정 | 보기 | 보기 | 알림 삭제/재시도만 해당(§5) |
| REPORTS | 수정 | **수정** | 보기(현재 STAFF는 `@Roles()`에서 이미 제외) | 리포트 발송은 담당 강사 업무 |

**ADMIN은 전 메뉴 기본값이 "수정"** — 기존 하드코딩 동작과 완전히 동일해서, 이 기능을 배포해도 원장이 설정을 건드리기 전까지 실장 쪽은 아무 동작 변화가 없다.

## 5. 적용 대상 엔드포인트 (전수 조사 완료)

아래 표의 엔드포인트에 `@RequirePermission(PermissionModule.X)` 데코레이터 + `PermissionGuard`를 추가한다. 이미 `@Roles()`가 해당 역할을 포함하지 않는 조합(예: TUITION의 TEACHER/STAFF)은 어차피 `RolesGuard`에서 먼저 막히므로 `PermissionGuard`까지 도달하지 않는다 — 안전.

| 모듈 | 엔드포인트 |
| :--- | :--- |
| STUDENTS | `POST /students`, `PATCH /students/:id`, `PATCH /students/:id/status`, `DELETE /students/:id`, `POST /students/bulk-import` |
| CLASSES | `POST /classes`, `PATCH /classes/:id`, `DELETE /classes/:id`, `POST /classes/:classId/enrollments`, `PATCH /classes/enrollments/:enrollmentId`, `DELETE /classes/enrollments/:enrollmentId` |
| ATTENDANCE | `POST /attendance/record`, `POST /attendance/batch`, `POST /attendance/quick-check`, `PATCH /attendance/:id/makeup`, `DELETE /attendance/:id`, `POST /attendance/trigger-unattended-alerts` (`POST /attendance/kiosk-token`은 ADMIN만 호출 가능한 라우트라 이 기능 대상에서 제외 — 실질적으로 항상 ADMIN 이상만 호출) |
| CLASS_LOGS | `POST /class-logs`, `PATCH /class-logs/:id`, `DELETE /class-logs/:id`, `PATCH /class-logs/:id/homework-submissions` |
| TUITION | `POST /tuition/invoices/generate`, `PATCH /tuition/invoices/:id`, `PATCH /tuition/invoices/:id/void`, `POST /tuition/invoices/:id/payments`, `POST /tuition/invoices/:id/send-reminder` |
| CALENDAR | `POST /calendar/events`, `PATCH /calendar/events/:id`, `DELETE /calendar/events/:id` |
| NOTIFICATIONS | `DELETE /notifications/:id`, `POST /notifications/:id/retry` — **`PATCH /notifications/:id/read`, `PATCH /notifications/read-all`은 제외**(본인 알림함 읽음 처리는 "메뉴 수정"이 아니라 개인 UI 상태라 이 시스템 대상이 아님, 지금처럼 `@Roles()`만으로 항상 허용) |
| REPORTS | `POST /reports/students/:id/send`, `POST /reports/classes/:id/send` |

## 6. 시행 메커니즘

```prisma
// (신규) common/decorators/require-permission.decorator.ts
export const RequirePermission = (module: PermissionModule) => SetMetadata(PERMISSION_MODULE_KEY, module);
```

```text
// (신규) common/guards/permission.guard.ts — 의사코드
1. 핸들러에 @RequirePermission이 없으면 통과(이 기능 대상이 아닌 라우트).
2. request.user 없으면 거부(JwtAuthGuard가 먼저 걸리므로 이론상 도달 안 함, 방어적).
3. user.role이 OWNER 또는 SUPER_ADMIN이면 항상 통과.
4. 그 외(ADMIN/TEACHER/STAFF): PermissionsService.canEdit(user.academyId, user.role, module) 결과를 반환.
   canEdit()은 RolePermission 행이 있으면 그 값, 없으면 §4 기본값 맵을 반환.
```

각 대상 컨트롤러에서 `@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)`로 가드 체인에 추가하고, 각 엔드포인트에 `@RequirePermission(PermissionModule.X)`를 `@Roles(...)` 바로 아래 붙인다. `RolesGuard`가 먼저 실행되어 애초에 역할 자체가 배제된 조합은 `PermissionGuard`까지 오지 않는다.

## 7. 신규 API (설정 조회/변경)

* `GET /auth/role-permissions` (`OWNER`, `ADMIN` — 실장도 자기 학원 설정을 조회는 가능, 변경은 불가): 3역할×8메뉴 = 24개 항목을 항상 전부 채워서 반환(미설정 조합은 §4 기본값으로 채움). 프론트가 기본값 로직을 몰라도 되게 서버가 항상 완전한 매트릭스를 준다.
  ```json
  [
    { "role": "ADMIN", "module": "STUDENTS", "canEdit": true },
    { "role": "TEACHER", "module": "ATTENDANCE", "canEdit": true }
  ]
  ```
* `PATCH /auth/role-permissions` (`OWNER` 전용): 변경할 항목만 배열로 전송 → 각각 upsert.
  ```json
  [{ "role": "TEACHER", "module": "TUITION", "canEdit": false }]
  ```
  `role`은 DTO에서 `ADMIN`/`TEACHER`/`STAFF`만 허용(`OWNER`/`SUPER_ADMIN` 지정 시 `400`) — 이 역시 이미 이 세션에서 반복 적용한 권한상승 방지 패턴.
* **"기본값으로 초기화"**: 별도 엔드포인트 없이, 프론트가 해당 조합을 §4 기본값으로 다시 `PATCH` 보내면 됨(또는 후속으로 `DELETE` 엔드포인트 추가 가능 — 이번 스코프 아님, YAGNI).

## 8. 테스트 계획

* `permissions.service.spec.ts` 신규: `canEdit()` 기본값 폴백/오버라이드 후 값 반영, `getMatrix()` 24개 항목 완전성.
* `permission.guard.spec.ts` 신규: OWNER/SUPER_ADMIN 항상 통과, ADMIN/TEACHER/STAFF는 서비스 결과 따름, `@RequirePermission` 없는 핸들러는 통과.
* 8개 대상 컨트롤러의 기존 `*.service.spec.ts`/`*.controller.spec.ts`는 이 변경으로 깨지지 않아야 함(가드는 컨트롤러 레이어이고 서비스 유닛테스트는 가드를 안 타므로 영향 없음 — 컨트롤러 스펙이 있는 모듈만 가드 목킹 필요, 이 저장소는 대부분 컨트롤러 스펙이 없는 컨벤션이라 영향 범위 작음).

## 9. 프론트 연동 요구사항 (구현 후 `AI_HANDOFF.md`로 전달 예정)

1. 교직원 관리 탭에 "권한 설정" 버튼 → 3역할×8메뉴 매트릭스 모달/화면, `GET/PATCH /auth/role-permissions` 연동.
2. 각 메뉴 화면에서 로그인한 사용자가 `canEdit=false`인 경우 수정/삭제 버튼 비활성화(백엔드가 최종 방어선이지만 UX상 미리 숨기는 게 맞음) — `GET /auth/me` 등에 현재 사용자의 유효 권한 요약을 얹을지, 아니면 프론트가 `GET /auth/role-permissions`로 전체 매트릭스를 받아 클라이언트에서 자기 role에 맞는 행만 걸러 쓸지는 프론트 구현 선택.

## 10. 자체 검토 체크리스트

- [x] TBD/placeholder 없음
- [x] 대상 엔드포인트 전수 조사 완료(§5) — grep으로 8개 컨트롤러 전체 재확인
- [x] 기존 `@Roles()`와의 관계 명확(상한선 유지, 하위 게이트만 추가)
- [x] 기본값 표에 실제 코드 근거 명시(추측 아님)
- [x] 권한 상승 방지: `role` 필드 DTO 제한, PATCH는 OWNER 전용
