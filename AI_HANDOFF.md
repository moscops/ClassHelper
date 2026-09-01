# 🤝 AI Handoff & Synchronization Log (AI_HANDOFF.md)

> 📌 **사용 목적**: 백엔드 전담 **Claude**와 프론트엔드 전담 **Gemini** 간의 비동기 협업 및 변경 사항 동기화 문서입니다.
> - **Claude (Backend)**: 백엔드 API 신규 생성, DTO 변경, DB 스키마 수정, 비즈니스 로직 업데이트 시 아래에 변경 사항과 프론트엔드 연동 가이드를 기록합니다.
> - **Gemini (Frontend)**: 이 파일의 최신 백엔드 변경 내역을 읽고, 프론트엔드 API 클라이언트(`src/lib/*-service.ts`) 및 UI 컴포넌트(`src/app/*`)를 즉시 업데이트한 뒤 빌드 검증 및 Git 커밋/푸시를 완료하고 상태를 갱신합니다.

---

## 🔄 최근 동기화 히스토리 (최신순)

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
