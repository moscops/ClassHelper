# 🤝 AI Handoff & Synchronization Log (AI_HANDOFF.md)

> 📌 **사용 목적**: 백엔드 전담 **Claude**와 프론트엔드 전담 **Gemini** 간의 비동기 협업 및 변경 사항 동기화 문서입니다.
> - **Claude (Backend)**: 백엔드 API 신규 생성, DTO 변경, DB 스키마 수정, 비즈니스 로직 업데이트 시 아래에 변경 사항과 프론트엔드 연동 가이드를 기록합니다.
> - **Gemini (Frontend)**: 이 파일의 최신 백엔드 변경 내역을 읽고, 프론트엔드 API 클라이언트(`src/lib/*-service.ts`) 및 UI 컴포넌트(`src/app/*`)를 즉시 업데이트한 뒤 빌드 검증 및 Git 커밋/푸시를 완료하고 상태를 갱신합니다.
> - **📦 아카이빙 규칙 (2026-09-04 도입)**: 파일이 계속 커지면 매 세션 읽는 비용이 커지므로, 아래 "최근 동기화 히스토리"는 **당일 날짜 항목만** 유지합니다. 날짜가 지나면(다음 날 작업 시작 시) 그 항목들을 [`AI_HANDOFF_ARCHIVE.md`](AI_HANDOFF_ARCHIVE.md) 맨 위(최신 항목 바로 아래)로 그대로 옮기세요. 과거 이력이 필요하면 그 파일을 참고합니다.

---

## 🔄 최근 동기화 히스토리 (최신순)

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
- **상태**: ⏳ Gemini 프론트엔드 연동 대기 중

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
