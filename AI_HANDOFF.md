# 🤝 AI Handoff & Synchronization Log (AI_HANDOFF.md)

> 📌 **사용 목적**: 백엔드 전담 **Claude**와 프론트엔드 전담 **Gemini** 간의 비동기 협업 및 변경 사항 동기화 문서입니다.
> - **Claude (Backend)**: 백엔드 API 신규 생성, DTO 변경, DB 스키마 수정, 비즈니스 로직 업데이트 시 아래에 변경 사항과 프론트엔드 연동 가이드를 기록합니다.
> - **Gemini (Frontend)**: 이 파일의 최신 백엔드 변경 내역을 읽고, 프론트엔드 API 클라이언트(`src/lib/*-service.ts`) 및 UI 컴포넌트(`src/app/*`)를 즉시 업데이트한 뒤 빌드 검증 및 Git 커밋/푸시를 완료하고 상태를 갱신합니다.

---

## 🔄 최근 동기화 히스토리 (최신순)

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
