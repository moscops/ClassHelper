export type UserRole = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'TEACHER' | 'STAFF';

export interface UserProfile {
  id: number;
  academyId?: number | null;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  createdAt: string;
}

export type PlanTier = 'FREE' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED';

export interface SubscriptionSummary {
  tier: PlanTier;
  status: SubscriptionStatus;
  expiresAt?: string | null;
  notes?: string | null;
}

export interface AcademySummary {
  id: number;
  name: string;
  businessNumber?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  subscription?: SubscriptionSummary | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  academy?: AcademySummary | null;
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserDetailResponse extends UserProfile {
  academy?: AcademySummary | null;
}
