export type PermissionModule =
  | 'STUDENTS'
  | 'CLASSES'
  | 'ATTENDANCE'
  | 'CLASS_LOGS'
  | 'TUITION'
  | 'CALENDAR'
  | 'NOTIFICATIONS'
  | 'REPORTS';

export type ControllableRole = 'ADMIN' | 'TEACHER' | 'STAFF';

export interface RolePermissionItem {
  role: ControllableRole;
  module: PermissionModule;
  canEdit: boolean;
}

export interface UpdateRolePermissionItem {
  role: ControllableRole;
  module: PermissionModule;
  canEdit: boolean;
}

export interface UpdateRolePermissionsPayload {
  permissions: UpdateRolePermissionItem[];
}

export interface ModuleMetadata {
  key: PermissionModule;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
}

export const PERMISSION_MODULES: ModuleMetadata[] = [
  {
    key: 'STUDENTS',
    label: '원생 관리',
    shortLabel: '원생',
    description: '원생 등록, 프로필 정보 수정, 원생 삭제 및 퇴원 처리',
    iconName: 'Users',
  },
  {
    key: 'CLASSES',
    label: '반 / 수업 관리',
    shortLabel: '수업반',
    description: '신규 수업반 개설, 정원·시간표 수정, 수강생 배정/해제',
    iconName: 'BookOpen',
  },
  {
    key: 'ATTENDANCE',
    label: '출결 관리',
    shortLabel: '출결',
    description: '1초 등하원 출결 체크, 결석/지각 기록, 보강 일정 등록',
    iconName: 'CheckCircle2',
  },
  {
    key: 'CLASS_LOGS',
    label: '수업 일지 & 과제',
    shortLabel: '일지·과제',
    description: '수업 진도일지 작성/수정, 숙제 검사 및 피드백 코멘트',
    iconName: 'FileText',
  },
  {
    key: 'TUITION',
    label: '수강료 & 수납',
    shortLabel: '수강료',
    description: '청구서 일괄 생성, 수납(결제) 처리, 영수증 발행 및 취소',
    iconName: 'CreditCard',
  },
  {
    key: 'CALENDAR',
    label: '학원 캘린더',
    shortLabel: '캘린더',
    description: '학원 일정 등록, 시험 기간 및 휴원일 생성/수정/삭제',
    iconName: 'Calendar',
  },
  {
    key: 'NOTIFICATIONS',
    label: '알림 관리',
    shortLabel: '알림',
    description: '카카오 알림톡/SMS 발송 이력 관리, 실패 건 재발송 및 삭제',
    iconName: 'Bell',
  },
  {
    key: 'REPORTS',
    label: '학습 리포트',
    shortLabel: '리포트',
    description: '원생별/반별 종합 학습 리포트 생성 및 학부모 전송',
    iconName: 'BarChart2',
  },
];

export const CONTROLLABLE_ROLES: {
  role: ControllableRole;
  label: string;
  subLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}[] = [
  {
    role: 'ADMIN',
    label: '부원장 / 실장 (ADMIN)',
    subLabel: '학원 전반 운영 및 원무 총괄',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200 dark:border-indigo-800',
  },
  {
    role: 'TEACHER',
    label: '강사 (TEACHER)',
    subLabel: '수업 지도, 과제 점검 및 출결 담당',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    role: 'STAFF',
    label: '조교 / 스태프 (STAFF)',
    subLabel: '등하원 출결 보조 및 학원 행정 지원',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    badgeBorder: 'border-slate-200 dark:border-slate-700',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<
  ControllableRole,
  Record<PermissionModule, boolean>
> = {
  ADMIN: {
    STUDENTS: true,
    CLASSES: true,
    ATTENDANCE: true,
    CLASS_LOGS: true,
    TUITION: true,
    CALENDAR: true,
    NOTIFICATIONS: true,
    REPORTS: true,
  },
  TEACHER: {
    STUDENTS: false,
    CLASSES: false,
    ATTENDANCE: true,
    CLASS_LOGS: true,
    TUITION: false,
    CALENDAR: false,
    NOTIFICATIONS: false,
    REPORTS: true,
  },
  STAFF: {
    STUDENTS: false,
    CLASSES: false,
    ATTENDANCE: true,
    CLASS_LOGS: false,
    TUITION: false,
    CALENDAR: false,
    NOTIFICATIONS: false,
    REPORTS: false,
  },
};
