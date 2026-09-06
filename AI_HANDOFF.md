# 🤝 AI Handoff & Synchronization Log (AI_HANDOFF.md)

> 📌 **사용 목적**: 백엔드 전담 **Claude**와 프론트엔드 전담 **Gemini** 간의 비동기 협업 및 변경 사항 동기화 문서입니다.
> - **Claude (Backend)**: 백엔드 API 신규 생성, DTO 변경, DB 스키마 수정, 비즈니스 로직 업데이트 시 아래에 변경 사항과 프론트엔드 연동 가이드를 기록합니다.
> - **Gemini (Frontend)**: 이 파일의 최신 백엔드 변경 내역을 읽고, 프론트엔드 API 클라이언트(`src/lib/*-service.ts`) 및 UI 컴포넌트(`src/app/*`)를 즉시 업데이트한 뒤 빌드 검증 및 Git 커밋/푸시를 완료하고 상태를 갱신합니다.
> - **📦 아카이빙 규칙 (2026-09-04 도입)**: 파일이 계속 커지면 매 세션 읽는 비용이 커지므로, 아래 "최근 동기화 히스토리"는 **당일 날짜 항목만** 유지합니다. 날짜가 지나면(다음 날 작업 시작 시) 그 항목들을 [`AI_HANDOFF_ARCHIVE.md`](AI_HANDOFF_ARCHIVE.md) 맨 위(최신 항목 바로 아래)로 그대로 옮기세요. 과거 이력이 필요하면 그 파일을 참고합니다.

---

## 🔄 최근 동기화 히스토리 (최신순)

### 📅 2026-09-06: 출석 키오스크 (전화번호 뒷자리 셀프 체크인) 백엔드 신규 — 프론트 연동 필요
- **작성자**: Claude (Backend)
- **작업 배경**: 학원 로비 태블릿에 전화번호 뒷자리를 입력하면 등/하원 처리되는 셀프 체크인 요청 (실제 매장 출석기 UX). 기존 `attendance/quick-check`는 스태프 로그인 후 학생을 골라 누르는 방식이라 별도 비인증 API로 신규 구현.
- **핵심 설계**:
  - 식별: 학생 본인 번호(`studentPhone`) 우선, 없으면 보호자 번호(`parentPhone`) 뒷자리로 대체.
  - 인증 없음: `Academy.kioskToken`(32바이트 hex, 신규 필드, 마이그레이션 `20260906070000_add_academy_kiosk_token`)으로 학원을 식별. JWT 불필요.
  - 브루트포스 방지: `/auth/login`과 동일하게 IP당 60초 5회(lookup)/10회(check-in) rate limit.
  - 수업 자동 매칭: 학생의 활성 수강 수업 중 `Class.schedule`에 오늘 요일 글자가 포함된 것만 후보로 반환, 없으면 전체 반환.
- **백엔드 신규 API** (상세 스펙: `backend/docs/domains/03-attendance-and-notifications.md` §4.8):
  1. `POST /attendance/kiosk-token` (JWT, OWNER/ADMIN) — 키오스크 접속 토큰 발급/재발급. 응답 `{ kioskToken }`.
  2. `POST /attendance/kiosk/lookup` (비인증) — `{ kioskToken, phoneLast4 }` → `{ matches: [{ studentId, studentName, classes: [{id,name}] }] }`. 형제/자매처럼 여러 명 매칭될 수 있음.
  3. `POST /attendance/kiosk/check-in` (비인증) — `{ kioskToken, phoneLast4, studentId, classId, type: "CHECK_IN"|"CHECK_OUT" }` → 기존 `AttendanceResponseDto`. **`phoneLast4`는 lookup 때 입력했던 값을 그대로 다시 보내야 함** (studentId만으로는 서버가 거부함 — 순차 ID 추측을 통한 출석 조작 방지).
- **프론트엔드 반영 완료 (Gemini)**:
  1. **API 클라이언트 확장 (`src/lib/attendance-service.ts`)**:
     - `generateKioskToken()`: `POST /attendance/kiosk-token` 연동 (JWT 인증)
     - `kioskLookup()`: `POST /attendance/kiosk/lookup` 비인증 조회
     - `kioskCheckIn()`: `POST /attendance/kiosk/check-in` 비인증 체크인
  2. **독립형 키오스크 풀스크린 라우트 (`src/app/kiosk/[token]/page.tsx`)**:
     - `AppLayout` 비의존 단독 풀스크린 반응형 UI (태블릿 터치 친화적 대형 버튼 & 고대비 디자인)
     - 4자리 전화번호 뒷자리 입력용 3x4 대형 터치 키패드 & 물리 키보드 지원 (4자리 입력 시 자동 1초 조회)
     - 형제/자매 다중 매칭 시 원생 선택 카드, 오늘 시간표 기반 수업 선택 기능 지원
     - 등원(`CHECK_IN`, 🎒) / 하원(`CHECK_OUT`, 🏠) 1초 체크인 및 성공 축하 애니메이션
     - Web Audio API 기반 소프트 차임/효과음 (키패드 탭, 체크인 성공음, 오류 경고음) 탑재
     - 3초 카운트다운 후 다음 학생 대기 자동 복귀 및 비정상 조작 방지 타임아웃
     - 태블릿 로비 거치용 브라우저 전체화면(F11) 및 볼륨 On/Off 제어
  3. **출결 관리 대시보드 키오스크 관리 모달 (`src/app/attendance/page.tsx`)**:
     - 상단 헤더에 **[출석 키오스크]** 버튼 추가
     - 학원 전용 키오스크 URL(`https://domain/kiosk/[kioskToken]`) 확인 및 원클릭 복사 기능
     - 키오스크 새 창/탭 즉시 실행 바로가기 및 토큰 신규/재발급 관리 인터페이스 탑재
- **빌드 검증**: `yarn frontend:build` 19개 전 라우트(정적 18 + 동적 `/kiosk/[token]`) 정상 통과 (exit code 0)
- **상태**: ✅ 백엔드/프론트엔드 출석 키오스크 시스템 연동 완료 및 정상 배포 준비 완료

### 📅 2026-09-06: 최고 관리자(SUPER_ADMIN) 관제 허브 세분화, 학원 분석 모달, 포트 충돌 방지 및 안전 리다이렉트 가드 구현
- **작성자**: Gemini (Frontend)
- **작업 배경**:
  - 로컬 개발 환경에서 백엔드(3000)와 프론트엔드 기본 포트 충돌 문제 해결 요청 (프론트 포트 5000으로 분리)
  - 최고 관리자(`admin@classhelper.kr`, `SUPER_ADMIN`)는 학원 ID(`academyId`)가 null이므로 일반 학원 전용 페이지(`/classes`, `/students`, `/attendance`, `/tuition`, `/staff`, `/dashboard`, `/notifications`) 방문 시 백엔드 DB 쿼리에서 500 에러 및 통신 장애 팝업 발생하던 현상 원천 차단
  - 최고 관리자를 위한 왼쪽 사이드바는 유지하면서, 플랫폼 관제 및 입점 학원들을 더욱 세밀하고 전문적으로 관리할 수 있는 세분화 인터페이스 구축
- **프론트엔드 반영 사항 (Gemini)**:
  1. **로컬 포트 5000 분리 & CORS 반영**:
     - `frontend/package.json`: dev/start 스크립트 포트를 5000(`next dev -p 5000`, `next start -p 5000`)으로 명시
     - `backend/src/main.ts`: CORS 허용 origin에 `http://localhost:5000` 추가
  2. **SUPER_ADMIN 전용 세분화 사이드바 내비게이션 (`AppLayout.tsx`)**:
     - 기존 단일 `/admin` 메뉴 대신 3대 관리 영역 및 5대 세부 탭으로 개편:
       - **플랫폼 관제**: 종합 관제 대시보드 (`/admin?tab=overview`), 시스템 & 인프라 (`/admin?tab=system`)
       - **학원 세부 관리**: 입점 학원 통합 관리 (`/admin?tab=academies`), 구독 요금제 & 플랜 (`/admin?tab=subscriptions`)
       - **보안 & 거버넌스**: 관리자 감사 로그 (`/admin?tab=audit-logs`)
     - 사이드바 상단에 보라색 '플랫폼 통합 관제 센터 (ROOT)' 전용 뱃지 및 프로필 카드 표시
  3. **입점 학원 세부 관리 및 상세 분석 모달 (`admin/page.tsx`)**:
     - 학원 목록에서 각 학원의 '상세 분석' 버튼 클릭 시 `adminService.getAcademyDetail(academyId)` 연동
     - **4대 핵심 지표 요약**: 소속 원생 수, 개설 반 수, 누적 출결 체크 수, 수강료 청구서 수
     - **학원 기본 정보**: 사업자 등록번호, 대표 전화번호, 주소 및 상세주소, 생성일, 최종 수정일
     - **교직원 명단 테이블**: 이름, 이메일, 전화번호, 직책(OWNER, ADMIN, TEACHER 등), 가입일
     - **구독 & 플랜 변경 및 상태 토글**: STARTER, PRO, ENTERPRISE 즉시 플랜 변경 및 학원 정지/활성화 기능
  4. **일반 학원 페이지 안전 가드 및 자동 리다이렉트**:
     - `/classes`, `/students`, `/attendance`, `/tuition`, `/staff`, `/dashboard`, `/notifications` 페이지에 `SUPER_ADMIN` 접속 시 불필요한 학원 데이터 페치를 건너뛰고 자동으로 `/admin`으로 안전 리다이렉트하도록 가드 적용
     - `academyId` 부재로 인한 500 Internal Server Error 및 "데이터베이스 통신 장애" 팝업 완전 방지
- **빌드 검증**: `yarn frontend:build` 18개 전 라우트 정상 통과 (exit code 0)

---

> 📦 **9/4 이전 기록은 [`AI_HANDOFF_ARCHIVE.md`](AI_HANDOFF_ARCHIVE.md)로 옮겨졌습니다** (Docker/EC2 배포 인프라, 교직원 페이지, 수강료/모달 표준화, 리포트 도메인, 구독 모델, CSV 일괄등록, 캘린더 도메인, 자동 로그인 DX 제안 등). 과거 이력이 필요하면 그 파일을 참고하세요.

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
