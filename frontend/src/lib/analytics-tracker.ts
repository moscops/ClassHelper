import { adminService } from './admin-service';

function isValidUuid(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

function getOrGenerateVisitorId(): string {
  try {
    let id = localStorage.getItem('classhelper_visitor_id');
    if (!id || !isValidUuid(id)) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = crypto.randomUUID();
      } else {
        id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
      localStorage.setItem('classhelper_visitor_id', id);
    }
    return id;
  } catch {
    return '00000000-0000-4000-8000-000000000000';
  }
}

/**
 * 하루에 한 번 비로그인 익명 방문자 추적 비콘을 백엔드(POST /analytics/track)로 전송합니다.
 */
export function ensureSiteVisitTracked(): void {
  if (typeof window === 'undefined') return;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const lastTracked = localStorage.getItem('classhelper_last_tracked_visit');
    if (lastTracked === today) {
      return; // 이미 오늘 방문 기록 완료
    }

    const visitorId = getOrGenerateVisitorId();
    adminService
      .trackVisitor(visitorId)
      .then(() => {
        try {
          localStorage.setItem('classhelper_last_tracked_visit', today);
        } catch {}
      })
      .catch(() => {
        // 비콘 전송 실패는 사용자 경험을 방해하지 않음
      });
  } catch {
    // localStorage 예외 무시
  }
}
