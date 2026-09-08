import { describe, expect, it } from 'vitest';
import {
  DISCIPLINE_LABELS,
  EMPLOYMENT_STATUS_CHIP_CLASS,
  PCC_STATUS_CHIP_CLASS,
  ROLE_LABELS,
  sortStaffByName,
  sortUsersByRoleThenName,
} from './staff';

describe('staff labels', () => {
  it('has a label for every discipline', () => {
    expect(DISCIPLINE_LABELS.nurse_coordinator).toBe('Nurse coordinator');
    expect(DISCIPLINE_LABELS.physiotherapist).toBe('Physiotherapist');
  });

  it('has a chip class for every PCC status', () => {
    expect(PCC_STATUS_CHIP_CLASS.verified).toBe('chip--completed');
    expect(PCC_STATUS_CHIP_CLASS.not_submitted).toBe('chip--missed');
  });

  it('has a chip class for every employment status', () => {
    expect(EMPLOYMENT_STATUS_CHIP_CLASS.active).toBe('chip--completed');
    expect(EMPLOYMENT_STATUS_CHIP_CLASS.inactive).toBe('chip--missed');
  });

  it('has a label for every role including the 4 new ones', () => {
    expect(ROLE_LABELS.admin).toBe('Admin');
    expect(ROLE_LABELS.field_staff).toBe('Nurse / Caregiver');
    expect(ROLE_LABELS.finance).toBe('Finance');
    expect(ROLE_LABELS.management).toBe('Management');
    expect(ROLE_LABELS.coordinator).toBe('Coordinator');
  });
});

describe('sortStaffByName', () => {
  it('sorts alphabetically by full_name', () => {
    const rows = [{ full_name: 'Zoe' }, { full_name: 'Anu' }];
    expect(sortStaffByName(rows).map((r) => r.full_name)).toEqual(['Anu', 'Zoe']);
  });
});

describe('sortUsersByRoleThenName', () => {
  it('groups by role in admin/coordinator/field_staff/finance/management order, then name within a role', () => {
    const rows = [
      { role: 'coordinator' as const, full_name: 'Zed Coord' },
      { role: 'admin' as const, full_name: 'Amy Admin' },
      { role: 'coordinator' as const, full_name: 'Abe Coord' },
    ];
    expect(sortUsersByRoleThenName(rows).map((r) => r.full_name)).toEqual([
      'Amy Admin',
      'Abe Coord',
      'Zed Coord',
    ]);
  });
});