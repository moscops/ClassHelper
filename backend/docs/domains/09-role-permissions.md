# 🔐 09. 역할별 커스텀 권한 도메인 (Role Permissions Domain)

## 📌 도메인 개요

역할별 커스텀 권한 도메인은 **원장(OWNER)이 실장(ADMIN)/강사(TEACHER)/조교(STAFF) 각 역할이 학원 내 8개 메뉴를 "수정"할 수 있는지를 직접 커스텀**할 수 있게 합니다. `OWNER`/`SUPER_ADMIN`은 이 시스템의 대상이 아니며 항상 전권입니다.

**핵심 설계 원칙**: 이 시스템은 기존 `@Roles()` 체크가 이미 허용한 범위 안에서만 "수정 가능 여부"를 추가로 좁히는 하위 게이트입니다. 어떤 역할이 애초에 접근 불가능한 라우트(예: `TEACHER`는 `tuition` 엔드포인트 자체에 `@Roles()`가 없어 접근 불가)를 이 시스템으로 열어줄 수는 없습니다 — 실수로 권한이 넓어지는 사고를 막기 위한 의도적 제약입니다.

---

## 🗄️ 1. 관련 엔티티 (Entities)

### 1) `RolePermission` (역할별 메뉴 권한 오버라이드)
* **역할**: 학원별로 특정 역할이 특정 메뉴를 수정할 수 있는지의 오버라이드 값 1건. 오버라이드 행이 없으면 하드코딩된 기본값(§4)으로 폴백한다 — 학원마다 24행(3역할×8메뉴)을 미리 만들어둘 필요가 없다(지연 기본값 방식).
* **대상 메뉴 (`PermissionModule`)**: `STUDENTS`(원생관리), `CLASSES`(반관리), `ATTENDANCE`(출결), `CLASS_LOGS`(수업일지·과제), `TUITION`(수강료), `CALENDAR`(캘린더), `NOTIFICATIONS`(알림 — 삭제/재발송만 해당, 읽음 처리는 대상 아님), `REPORTS`(리포트 발송).
* **주요 필드**:
  * `role`: 애플리케이션(DTO) 레벨에서 `ADMIN`/`TEACHER`/`STAFF`만 허용 — `OWNER`/`SUPER_ADMIN` 지정 시 `400`(권한상승 방지, 이 프로젝트에서 반복 적용된 패턴).
  * `module`: `PermissionModule`
  * `canEdit`: `true`면 수정 가능, `false`면 조회만 가능
  * `@@unique([academyId, role, module])` — 같은 학원의 같은 역할·메뉴 조합은 1행만 존재
* **제외된 메뉴(고정, 토글 대상 아님)**: 교직원 관리(`auth`의 `staff/*`) 자체, 학원코드/비밀번호 관련 기능, `admin` 모듈 전체(플랫폼 관리자 전용) — 권한을 다루는 기능 자체를 토글 가능하게 하면 실장이 자기 권한을 스스로 넓히는 등 꼬일 여지가 있어 제외.

---

## 👥 2. 역할별 권한 매트릭스 (Role Permissions Matrix)

| 기능 / API | SUPER_ADMIN | OWNER | ADMIN | TEACHER | STAFF |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **역할별 권한 매트릭스 조회 (`GET /auth/role-permissions`)** | ❌ | ✅ | ✅ | ❌ | ❌ |
| **역할별 권한 매트릭스 변경 (`PATCH /auth/role-permissions`)** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **8개 대상 메뉴의 실제 수정 가능 여부** | 항상 가능 | 항상 가능 | §4 기본값 또는 원장이 설정한 값 | 〃 | 〃 |

실장은 매트릭스를 **조회**는 할 수 있지만(자신의 권한 현황을 확인할 수 있도록) **변경**은 원장만 가능합니다.

---

## 🔄 3. 권한 판정 흐름

```text
[ ADMIN/TEACHER/STAFF가 8개 대상 모듈 중 하나의 쓰기(POST/PATCH/DELETE) 라우트 호출 ]
       │
       ▼
JwtAuthGuard → RolesGuard (기존 @Roles() 체크 — 여기서 막히면 PermissionGuard까지 도달 안 함)
       │
       ▼
PermissionGuard
       │  @RequirePermission(module)이 없는 라우트는 통과
       │  OWNER/SUPER_ADMIN은 항상 통과
       ▼
PermissionsService.canEdit(academyId, role, module)
       │  RolePermission 오버라이드 행이 있으면 그 값
       │  없으면 §4 기본값으로 폴백
       ▼
canEdit === true → 통과 / false → 403 Forbidden
```

---

## 📡 4. RESTful API 명세 (API Specifications)

> 구현 위치: `backend/src/permissions/` (`permissions.controller.ts`, `permissions.service.ts`), 시행 메커니즘은 `backend/src/common/guards/permission.guard.ts` + `backend/src/common/decorators/require-permission.decorator.ts`.

### 4.1. 역할별 권한 매트릭스 조회
* **엔드포인트**: `GET /auth/role-permissions` (`OWNER`, `ADMIN`)
* **Response Body (`RolePermissionDto[]`)**: 3역할×8메뉴 = **항상 24개 항목 고정** 반환(미설정 조합은 기본값으로 채움 — 프론트가 기본값 로직을 알 필요 없음).
  ```json
  [
    { "role": "ADMIN", "module": "STUDENTS", "canEdit": true },
    { "role": "TEACHER", "module": "ATTENDANCE", "canEdit": true },
    { "role": "TEACHER", "module": "TUITION", "canEdit": false }
  ]
  ```

### 4.2. 역할별 권한 매트릭스 변경
* **엔드포인트**: `PATCH /auth/role-permissions` (`OWNER` 전용)
* **Request Body (`UpdateRolePermissionsDto`)**: 변경할 항목만 전달하면 된다(전체 24개를 매번 보낼 필요 없음).
  ```json
  { "permissions": [{ "role": "TEACHER", "module": "TUITION", "canEdit": true }] }
  ```
* **Response Body**: 갱신된 전체 24개 매트릭스(4.1과 동일한 형태).
* **동작 특성**: `role`이 `ADMIN`/`TEACHER`/`STAFF`가 아니면 `400`.

### 4.3. 기본값 (오버라이드 없을 때, 코드 확인 기반으로 도출)

| 메뉴 | ADMIN | TEACHER | STAFF |
| :--- | :---: | :---: | :---: |
| STUDENTS | 수정 | 보기 | 보기 |
| CLASSES | 수정 | 보기 | 보기 |
| ATTENDANCE | 수정 | **수정** | **수정** |
| CLASS_LOGS | 수정 | **수정** | 보기 |
| TUITION | 수정 | 보기 | 보기 |
| CALENDAR | 수정 | 보기 | 보기 |
| NOTIFICATIONS | 수정 | 보기 | 보기 |
| REPORTS | 수정 | **수정** | 보기 |

ADMIN은 전 메뉴 기본값이 "수정"이라, 이 기능을 배포해도 원장이 설정을 건드리기 전까지 실장 쪽은 기존과 동작 변화가 없다. TEACHER/STAFF의 출결(그리고 TEACHER의 수업일지·리포트)이 기본값부터 "수정"인 이유는 실제 `@Roles()`에 이미 TEACHER/STAFF가 포함되어 있던 본연의 업무이기 때문(출결은 조교도 실무로 함 — 키오스크 보조).

### 4.4. `PermissionGuard`가 적용된 정확한 엔드포인트 목록

| 모듈 | 엔드포인트 |
| :--- | :--- |
| STUDENTS | `POST /students`, `PATCH /students/:id`, `PATCH /students/:id/status`, `DELETE /students/:id`, `POST /students/bulk-import` |
| CLASSES | `POST /classes`, `PATCH /classes/:id`, `DELETE /classes/:id`, `POST /classes/:classId/enrollments`, `PATCH /classes/enrollments/:enrollmentId`, `DELETE /classes/enrollments/:enrollmentId` |
| ATTENDANCE | `POST /attendance/record`, `POST /attendance/batch`, `POST /attendance/quick-check`, `PATCH /attendance/:id/makeup`, `DELETE /attendance/:id`, `POST /attendance/trigger-unattended-alerts` |
| CLASS_LOGS | `POST /class-logs`, `PATCH /class-logs/:id`, `DELETE /class-logs/:id`, `PATCH /class-logs/:id/homework-submissions` |
| TUITION | `POST /tuition/invoices/generate`, `PATCH /tuition/invoices/:id`, `PATCH /tuition/invoices/:id/void`, `POST /tuition/invoices/:id/payments`, `POST /tuition/invoices/:id/send-reminder` |
| CALENDAR | `POST /calendar/events`, `PATCH /calendar/events/:id`, `DELETE /calendar/events/:id` |
| NOTIFICATIONS | `DELETE /notifications/:id`, `POST /notifications/:id/retry` (읽음 처리 `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`은 제외 — 개인 알림함 상태라 이 시스템 대상 아님) |
| REPORTS | `POST /reports/students/:id/send`, `POST /reports/classes/:id/send` |

`POST/GET /attendance/kiosk-token`은 원래 `ADMIN` 이상만 호출 가능한 라우트라 이 기능 대상에서 제외됩니다.
