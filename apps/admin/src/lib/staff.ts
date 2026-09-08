export type StaffDiscipline =
  'nurse' | 'caregiver' | 'physiotherapist' | 'doctor' | 'nurse_coordinator' | 'other';

export const DISCIPLINE_LABELS: Record<StaffDiscipline, string> = {
  nurse: 'Nurse',
  caregiver: 'Caregiver',
  physiotherapist: 'Physiotherapist',
  doctor: 'Doctor',
  nurse_coordinator: 'Nurse coordinator',
  other: 'Other',
};

export type PccStatus = 'not_submitted' | 'pending' | 'verified';

export const PCC_STATUS_LABELS: Record<PccStatus, string> = {
  not_submitted: 'Not submitted',
  pending: 'Pending',
  verified: 'Verified',
};

export const PCC_STATUS_CHIP_CLASS: Record<PccStatus, string> = {
  not_submitted: 'chip--missed',
  pending: 'chip--pending',
  verified: 'chip--completed',
};

export type EmploymentStatus = 'active' | 'inactive';

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const EMPLOYMENT_STATUS_CHIP_CLASS: Record<EmploymentStatus, string> = {
  active: 'chip--completed',
  inactive: 'chip--missed',
};

export type StaffRateType = 'per_visit' | 'monthly' | 'hourly';

export const RATE_TYPE_LABELS: Record<StaffRateType, string> = {
  per_visit: 'Per visit',
  monthly: 'Monthly',
  hourly: 'Hourly',
};

export type UserRole =
  'admin' | 'coordinator' | 'field_staff' | 'finance' | 'management' | 'member';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  coordinator: 'Coordinator',
  field_staff: 'Nurse / Caregiver',
  finance: 'Finance',
  management: 'Management',
  member: 'Member',
};

// Roles a coordinator/admin can invite someone into via the Users & Roles
// screen -- 'member' is excluded, members self-signup through the wellness
// app and are never created via staff invite.
export const INVITABLE_ROLES: Exclude<UserRole, 'member'>[] = [
  'admin',
  'coordinator',
  'field_staff',
  'finance',
  'management',
];

const ROLE_SORT_ORDER: Record<UserRole, number> = {
  admin: 0,
  coordinator: 1,
  field_staff: 2,
  finance: 3,
  management: 4,
  member: 5,
};

export interface StaffLike {
  full_name: string;
}

export function sortStaffByName<T extends StaffLike>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export interface UserLike {
  role: UserRole;
  full_name: string;
}

export function sortUsersByRoleThenName<T extends UserLike>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const roleDiff = ROLE_SORT_ORDER[a.role] - ROLE_SORT_ORDER[b.role];
    if (roleDiff !== 0) return roleDiff;
    return a.full_name.localeCompare(b.full_name);
  });
}
