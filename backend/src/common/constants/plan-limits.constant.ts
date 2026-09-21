import { PlanTier } from '@prisma/client';

/**
 * 요금제 등급별 한도 및 가격 참고 정보.
 *
 * ⚠️ 참고용 상수이며 실제로 강제(enforce)되지 않는다 — 원생/반 생성 시 이 한도를 넘는지
 * 검사하는 로직은 아직 없다. 결제 연동(Stripe/Toss 등) 및 실사용 고객이 생긴 이후
 * 별도 작업으로 강제 적용 예정.
 */
export const PLAN_LIMITS: Record<
  PlanTier,
  {
    label: string;
    monthlyPrice: number;
    maxStudents: number | null; // null = 무제한
    maxAcademies: number | null; // null = 무제한 (본원/분원 지원 여부)
  }
> = {
  [PlanTier.FREE]: {
    label: '무료',
    monthlyPrice: 0,
    maxStudents: 50,
    maxAcademies: 1,
  },
  [PlanTier.PRO]: {
    label: '프로',
    monthlyPrice: 0, // TODO: 결제 연동 시 실제 가격 반영
    maxStudents: null,
    maxAcademies: 1,
  },
  [PlanTier.ENTERPRISE]: {
    label: '엔터프라이즈',
    monthlyPrice: 0, // TODO: 결제 연동 시 실제 가격 반영
    maxStudents: null,
    maxAcademies: null,
  },
};
