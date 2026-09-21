export type StaffRole = 'OWNER' | 'ADMIN' | 'TEACHER' | 'STAFF';

export interface StaffTaughtClass {
  id: number;
  name: string;
  subject?: string | null;
  targetGrade?: string | null;
  schedule?: string | null;
  capacity?: number | null;
  monthlyFee?: number;
  enrolledCount?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
}

export interface StaffMember {
  id: number;
  academyId?: number | null;
  email: string;
  name: string;
  phone?: string | null;
  role: StaffRole;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt?: string;
  mustChangePassword?: boolean;
  tempPassword?: string;
  taughtClasses?: StaffTaughtClass[];
  taughtClassesCount?: number;
  processedPaymentsCount?: number;
  classLogsCount?: number;
}

export type StaffRegisteredResult = StaffMember;

export interface CreateStaffInput {
  email: string;
  password?: string;
  name: string;
  phone?: string;
  role: 'ADMIN' | 'TEACHER' | 'STAFF';
}

export interface UpdateStaffInput {
  name?: string;
  phone?: string;
  role?: 'ADMIN' | 'TEACHER' | 'STAFF';
}

export interface ResetStaffPasswordInput {
  newPassword?: string;
}

export interface JoinStaffInput {
  code: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'TEACHER' | 'STAFF';
}

export interface StaffJoinCodeResponse {
  staffJoinCode: string | null;
}

export interface StaffStats {
  totalStaff: number;
  ownerCount: number;
  adminCount: number;
  teacherCount: number;
  staffCount: number;
  assignedClassesCount: number;
  activeAccountsCount: number;
}

