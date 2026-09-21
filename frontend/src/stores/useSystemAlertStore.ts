import { create } from 'zustand';

export interface SystemAlert {
  id: string;
  type: 'DB_CONNECTION_ERROR' | 'SERVER_ERROR';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface SystemAlertState {
  alert: SystemAlert | null;
  hasError: boolean;
  setSystemError: (message?: string) => void;
  markAsRead: () => void;
  clearError: () => void;
}

// Clean up any legacy persisted alert from localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('classhelper_system_alert_single');
  } catch {
    // ignore
  }
}

export const useSystemAlertStore = create<SystemAlertState>()((set, get) => ({
  alert: null,
  hasError: false,

  setSystemError: (customMessage) => {
    const defaultTitle = '데이터베이스 / 서버 통신 장애';
    const defaultMessage =
      customMessage ||
      '데이터베이스 및 백엔드 서버에 연결할 수 없어 학생 및 반 목록 데이터를 정상적으로 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';

    set({
      alert: {
        id: 'system-db-connection-error',
        type: 'DB_CONNECTION_ERROR',
        title: defaultTitle,
        message: defaultMessage,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      hasError: true,
    });
  },

  markAsRead: () => {
    const current = get().alert;
    if (current) {
      set({
        alert: { ...current, isRead: true },
      });
    }
  },

  clearError: () => {
    set({ alert: null, hasError: false });
  },
}));
